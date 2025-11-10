// Direct HTTPS connection to external API
const API_BASE_URL = "https://ifms.pro.br:6003";

const makeRequest = async (path: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
};

export interface Usuario {
  id?: number;
  nome: string;
  token_gmail: string;
  turma: number;
  periodo: number;
  url_image_perfil?: string;
  email: string;
}

export interface Time {
  id?: number;
  nome_time: string;
  dono_id: number;
  senha_convite?: string;
  imagem_time?: string;
}

export interface Integrante {
  usuario_id: number;
  funcao: string;
}

// Usuários
export const listarUsuarios = async (): Promise<Usuario[]> => {
  const response = await makeRequest('/usuarios');
  if (!response.ok) throw new Error("Erro ao listar usuários");
  return response.json();
};

export const criarUsuario = async (usuario: Usuario): Promise<Usuario> => {
  const params = new URLSearchParams();
  params.set('nome', usuario.nome);
  if (usuario.token_gmail) params.set('token_gmail', usuario.token_gmail);
  params.set('turma', String(usuario.turma));
  params.set('periodo', String(usuario.periodo));
  if (usuario.url_image_perfil) params.set('url_image_perfil', usuario.url_image_perfil);
  params.set('email', usuario.email);

  const response = await makeRequest('/usuarios', {
    method: "POST",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    let detail: any = "";
    const ct = response.headers.get('content-type') || "";
    try {
      detail = ct.includes('application/json') ? await response.json() : await response.text();
    } catch {}
    const message = typeof detail === "string" ? detail : detail?.message || JSON.stringify(detail);
    throw new Error(message || `Erro ao criar usuário (${response.status})`);
  }
  return response.json();
};

export const alterarUsuario = async (id: number, usuario: Partial<Usuario>): Promise<Usuario> => {
  const params = new URLSearchParams();
  if (usuario.nome) params.set('nome', usuario.nome);
  if (usuario.token_gmail) params.set('token_gmail', usuario.token_gmail);
  if (usuario.turma !== undefined) params.set('turma', String(usuario.turma));
  if (usuario.periodo !== undefined) params.set('periodo', String(usuario.periodo));
  if (usuario.url_image_perfil !== undefined) params.set('url_image_perfil', usuario.url_image_perfil);
  if (usuario.email) params.set('email', usuario.email);

  const response = await makeRequest(`/usuarios/${id}`, {
    method: "PUT",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    let detail: any = "";
    const ct = response.headers.get('content-type') || "";
    try {
      detail = ct.includes('application/json') ? await response.json() : await response.text();
    } catch {}
    const message = typeof detail === "string" ? detail : detail?.message || JSON.stringify(detail);
    throw new Error(message || `Erro ao alterar usuário (${response.status})`);
  }
  return response.json();
};

export const listarUsuariosSemTime = async (): Promise<Usuario[]> => {
  const response = await makeRequest('/usuarios/sem-time');
  if (!response.ok) throw new Error("Erro ao listar usuários sem time");
  return response.json();
};

export const mostrarTimeUsuario = async (usuarioId: number) => {
  const response = await makeRequest(`/usuarios/${usuarioId}/time`);
  if (!response.ok) throw new Error("Erro ao mostrar time do usuário");
  return response.json();
};

// Times
export const listarTimes = async (): Promise<Time[]> => {
  const response = await makeRequest('/times');
  if (!response.ok) throw new Error("Erro ao listar times");
  return response.json();
};

export const criarTime = async (time: Time): Promise<Time> => {
  const response = await makeRequest('/times', {
    method: "POST",
    body: JSON.stringify(time),
  });
  if (!response.ok) throw new Error("Erro ao criar time");
  return response.json();
};

export const mostrarTime = async (timeId: number) => {
  const response = await makeRequest(`/times/${timeId}`);
  if (!response.ok) throw new Error("Erro ao mostrar time");
  return response.json();
};

export const listarTimesIncompletos = async () => {
  const response = await makeRequest('/times/incompletos');
  if (!response.ok) throw new Error("Erro ao listar times incompletos");
  return response.json();
};

export const adicionarIntegrante = async (timeId: number, integrante: Integrante) => {
  const response = await makeRequest(`/times/${timeId}/integrantes`, {
    method: "POST",
    body: JSON.stringify(integrante),
  });
  if (!response.ok) throw new Error("Erro ao adicionar integrante");
  return response.json();
};

export const removerIntegrante = async (timeId: number, usuarioId: number) => {
  const response = await makeRequest(`/times/${timeId}/integrantes/${usuarioId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao remover integrante");
  return response.json();
};
