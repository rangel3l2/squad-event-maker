const API_BASE_URL = "http://ifms.pro.br:6003";

export interface Usuario {
  id?: number;
  nome: string;
  token_gmail: string;
  turma: number;
  periodo: number;
  url_image_perfil: string;
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
  const response = await fetch(`${API_BASE_URL}/usuarios`);
  if (!response.ok) throw new Error("Erro ao listar usuários");
  return response.json();
};

export const criarUsuario = async (usuario: Usuario): Promise<Usuario> => {
  const response = await fetch(`${API_BASE_URL}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(usuario),
  });
  if (!response.ok) throw new Error("Erro ao criar usuário");
  return response.json();
};

export const alterarUsuario = async (id: number, usuario: Partial<Usuario>): Promise<Usuario> => {
  const response = await fetch(`${API_BASE_URL}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(usuario),
  });
  if (!response.ok) throw new Error("Erro ao alterar usuário");
  return response.json();
};

export const listarUsuariosSemTime = async (): Promise<Usuario[]> => {
  const response = await fetch(`${API_BASE_URL}/usuarios/sem-time`);
  if (!response.ok) throw new Error("Erro ao listar usuários sem time");
  return response.json();
};

export const mostrarTimeUsuario = async (usuarioId: number) => {
  const response = await fetch(`${API_BASE_URL}/usuarios/${usuarioId}/time`);
  if (!response.ok) throw new Error("Erro ao mostrar time do usuário");
  return response.json();
};

// Times
export const listarTimes = async (): Promise<Time[]> => {
  const response = await fetch(`${API_BASE_URL}/times`);
  if (!response.ok) throw new Error("Erro ao listar times");
  return response.json();
};

export const criarTime = async (time: Time): Promise<Time> => {
  const response = await fetch(`${API_BASE_URL}/times`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(time),
  });
  if (!response.ok) throw new Error("Erro ao criar time");
  return response.json();
};

export const mostrarTime = async (timeId: number) => {
  const response = await fetch(`${API_BASE_URL}/times/${timeId}`);
  if (!response.ok) throw new Error("Erro ao mostrar time");
  return response.json();
};

export const listarTimesIncompletos = async () => {
  const response = await fetch(`${API_BASE_URL}/times/incompletos`);
  if (!response.ok) throw new Error("Erro ao listar times incompletos");
  return response.json();
};

export const adicionarIntegrante = async (timeId: number, integrante: Integrante) => {
  const response = await fetch(`${API_BASE_URL}/times/${timeId}/integrantes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(integrante),
  });
  if (!response.ok) throw new Error("Erro ao adicionar integrante");
  return response.json();
};

export const removerIntegrante = async (timeId: number, usuarioId: number) => {
  const response = await fetch(`${API_BASE_URL}/times/${timeId}/integrantes/${usuarioId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao remover integrante");
  return response.json();
};
