import { makeAuthenticatedRequest } from "@/services/api";

/**
 * Convites para entrar em time — rotas oficiais da API
 * (tabela public.convite_entrar_time).
 *
 *  POST   /convite-entrar-time                        → registrar solicitação
 *  GET    /usuarios/{id}/convites-entrar-time         → solicitações feitas pelo usuário
 *  GET    /times/{id}/convites-entrar-time            → solicitações recebidas pelo time
 *  PATCH  /convite-entrar-time/{id}                   → aceitar / recusar / ocultar
 *  DELETE /convite-entrar-time/{id}                   → exclusão física
 */

export interface Convite {
  id: number;
  id_user: number;
  id_time: number;
  /** true = aceito, false = ainda não aceito/recusado */
  status: boolean;
  /** false = exclusão virtual (some das listagens) */
  ativo: boolean;
  usuario_nome?: string;
  usuario_email?: string;
  usuario_imagem?: string;
  nome_time?: string;
  imagem_time?: string;
  img_logo_pequeno?: string;
}

const parse = async (response: Response, acao: string) => {
  const texto = await response.text();
  let dados: any = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = null;
  }
  if (!response.ok) {
    throw new Error(dados?.detail || dados?.message || `Erro ao ${acao} (${response.status})`);
  }
  return dados;
};

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
};

/** 1. Registrar solicitação de entrada em um time. */
export const registrarConvite = async (idUser: number, idTime: number): Promise<Convite> => {
  const response = await makeAuthenticatedRequest("/convite-entrar-time", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_user: idUser, id_time: idTime }),
  });
  const dados = await parse(response, "registrar solicitação");
  return dados.convite as Convite;
};

/** 2. Solicitações feitas por um usuário. */
export const listarConvitesDoUsuario = async (
  usuarioId: number,
  incluirInativos = false
): Promise<Convite[]> => {
  const response = await makeAuthenticatedRequest(
    `/usuarios/${usuarioId}/convites-entrar-time${qs({ incluir_inativos: incluirInativos || undefined })}`
  );
  const dados = await parse(response, "listar solicitações do usuário");
  return (dados?.convites ?? []) as Convite[];
};

/**
 * 3. Solicitações recebidas por um time.
 * `status=false` → pendentes/recusadas; `status=true` (padrão da API) → aceitas.
 */
export const listarConvitesDoTime = async (
  timeId: number,
  opcoes: { status?: boolean; incluirInativos?: boolean } = {}
): Promise<Convite[]> => {
  const response = await makeAuthenticatedRequest(
    `/times/${timeId}/convites-entrar-time${qs({
      status: opcoes.status,
      incluir_inativos: opcoes.incluirInativos || undefined,
    })}`
  );
  const dados = await parse(response, "listar solicitações do time");
  return (dados?.convites ?? []) as Convite[];
};

/** Solicitações ainda não aceitas (a caixa de entrada do capitão). */
export const listarConvitesPendentes = (timeId: number) =>
  listarConvitesDoTime(timeId, { status: false });

/** 4/5. Atualizar convite: aceitar, recusar e/ou ocultar (exclusão virtual). */
export const atualizarConvite = async (
  conviteId: number,
  dados: { aceito?: boolean; ativo?: boolean }
): Promise<Convite> => {
  const response = await makeAuthenticatedRequest(`/convite-entrar-time/${conviteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const resultado = await parse(response, "atualizar solicitação");
  return resultado.convite as Convite;
};

/** Aceita o convite e já o remove das listagens. */
export const aceitarConvite = (conviteId: number) =>
  atualizarConvite(conviteId, { aceito: true, ativo: false });

/** Recusa o convite e o remove das listagens. */
export const recusarConvite = (conviteId: number) =>
  atualizarConvite(conviteId, { aceito: false, ativo: false });

/** Oculta o convite sem decidir (exclusão virtual). */
export const ocultarConvite = (conviteId: number) => atualizarConvite(conviteId, { ativo: false });

/** 6. Exclusão física do convite (usado quando o solicitante cancela). */
export const excluirConvite = async (conviteId: number): Promise<void> => {
  const response = await makeAuthenticatedRequest(`/convite-entrar-time/${conviteId}`, {
    method: "DELETE",
  });
  await parse(response, "excluir solicitação");
};

/** Encontra o convite (pendente ou não) de um usuário para um time. */
export const buscarConvite = async (
  timeId: number,
  usuarioId: number
): Promise<Convite | null> => {
  const [pendentes, aceitos] = await Promise.all([
    listarConvitesDoTime(timeId, { status: false }).catch(() => [] as Convite[]),
    listarConvitesDoTime(timeId, { status: true }).catch(() => [] as Convite[]),
  ]);
  return [...pendentes, ...aceitos].find((c) => c.id_user === usuarioId) ?? null;
};

/** Reflete na API a decisão do capitão (aceitar/recusar) tomada no site. */
export const sincronizarDecisao = async (
  timeId: number,
  usuarioId: number,
  aceito: boolean
): Promise<void> => {
  const convite = await buscarConvite(timeId, usuarioId);
  if (convite) await atualizarConvite(convite.id, { aceito, ativo: false });
};

/** Remove na API a solicitação quando o próprio jogador cancela. */
export const cancelarConviteDoUsuario = async (
  timeId: number,
  usuarioId: number
): Promise<void> => {
  const convite = await buscarConvite(timeId, usuarioId);
  if (convite) await excluirConvite(convite.id);
};
