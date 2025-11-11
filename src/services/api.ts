// Direct HTTPS connection to external API
const API_BASE_URL = "https://ifms.pro.br:6003";

const makeRequest = async (path: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${path}`;
  console.log("=== makeRequest ===");
  console.log("URL:", url);
  console.log("Method:", options?.method);
  console.log("Body:", options?.body);
  console.log("Headers:", options?.headers);
  
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
  integrantes?: Integrante[];
  quantidade?: number;
  qtd_integrantes?: number;
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
  // Enviar como application/x-www-form-urlencoded conforme requisito da API
  const params = new URLSearchParams();
  params.set('nome', usuario.nome);
  if (usuario.token_gmail) params.set('token_gmail', usuario.token_gmail);
  params.set('turma', String(usuario.turma));
  params.set('periodo', String(usuario.periodo));
  // Sempre enviar o campo, mesmo vazio
  params.set('url_image_perfil', (usuario.url_image_perfil ?? '').toString());
  params.set('email', usuario.email);

  console.log('=== API criarUsuario (form) ===');
  console.log('Body (form):', params.toString());

  const response = await makeRequest('/usuarios', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    let detail: any = '';
    const ct = response.headers.get('content-type') || '';
    try {
      detail = ct.includes('application/json') ? await response.json() : await response.text();
    } catch {}
    const message = typeof detail === 'string' ? detail : detail?.message || JSON.stringify(detail);
    throw new Error(message || `Erro ao criar usuário (${response.status})`);
  }
  return response.json();
};

export const alterarUsuario = async (id: number, usuario: Partial<Usuario>): Promise<Usuario> => {
  // Enviar como application/x-www-form-urlencoded conforme requisito da API
  const params = new URLSearchParams();
  if (usuario.nome !== undefined) params.set('nome', usuario.nome);
  if (usuario.token_gmail !== undefined) params.set('token_gmail', usuario.token_gmail);
  if (usuario.turma !== undefined) params.set('turma', String(usuario.turma));
  if (usuario.periodo !== undefined) params.set('periodo', String(usuario.periodo));
  if (usuario.url_image_perfil !== undefined) params.set('url_image_perfil', usuario.url_image_perfil ?? '');
  if (usuario.email !== undefined) params.set('email', usuario.email);

  console.log('=== API alterarUsuario (form) ===');
  console.log('Body (form):', params.toString());

  const response = await makeRequest(`/usuarios/${id}`, {
    method: 'PUT',
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
  const data = await response.json();
  
  // A API retorna { time: {...}, integrantes: [...] }
  // Vamos mesclar para manter compatibilidade
  return {
    ...data.time,
    integrantes: data.integrantes
  };
};

// Times
export const listarTimes = async (): Promise<Time[]> => {
  const response = await makeRequest('/times');
  if (!response.ok) throw new Error("Erro ao listar times");
  return response.json();
};

export const criarTime = async (time: Time): Promise<Time> => {
  const params = new URLSearchParams();
  params.set('nome_time', time.nome_time);
  params.set('dono_id', String(time.dono_id));
  if (time.senha_convite) params.set('senha_convite', time.senha_convite);
  if (time.imagem_time) params.set('imagem_time', time.imagem_time);

  console.log("=== API criarTime ===");
  console.log("Objeto Time recebido:", time);
  console.log("URLSearchParams:", params.toString());
  console.log("Corpo da requisição (decoded):", {
    nome_time: params.get('nome_time'),
    dono_id: params.get('dono_id'),
    senha_convite: params.get('senha_convite'),
    imagem_time: params.get('imagem_time')?.substring(0, 50) + '...'
  });

  const response = await makeRequest('/times', {
    method: "POST",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  
  console.log("=== RESPOSTA DA API ===");
  console.log("Status:", response.status);
  console.log("Status Text:", response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API:", errorText);
    throw new Error(`Erro ao criar time: ${response.status} - ${errorText}`);
  }
  
  return response.json();
};

export const mostrarTime = async (timeId: number) => {
  const response = await makeRequest(`/times/${timeId}`);
  if (!response.ok) throw new Error("Erro ao mostrar time");
  const data = await response.json();
  
  // A API retorna { time: {...}, integrantes: [...] }
  // Vamos mesclar para manter compatibilidade
  return {
    ...data.time,
    integrantes: data.integrantes
  };
};

export const listarTimesIncompletos = async () => {
  const response = await makeRequest('/times/incompletos');
  if (!response.ok) throw new Error("Erro ao listar times incompletos");
  return response.json();
};

export const adicionarIntegrante = async (timeId: number, integrante: Integrante) => {
  console.log("=== API adicionarIntegrante ===");
  console.log("Time ID:", timeId);
  console.log("Integrante:", integrante);
  console.log("URL:", `/times/${timeId}/integrantes`);
  const params = new URLSearchParams();
  params.set('usuario_id', String(integrante.usuario_id));
  if (integrante.funcao) params.set('funcao', integrante.funcao);
  console.log("Body (form):", params.toString());

  const response = await makeRequest(`/times/${timeId}/integrantes`, {
    method: "POST",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  
  console.log("Status da resposta:", response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API:", errorText);
    throw new Error(`Erro ao adicionar integrante: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log("Integrante adicionado com sucesso:", result);
  return result;
};

export const removerIntegrante = async (timeId: number, usuarioId: number) => {
  const response = await makeRequest(`/times/${timeId}/integrantes/${usuarioId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao remover integrante");
  return response.json();
};

export const deletarTime = async (timeId: number) => {
  const response = await makeRequest(`/times/${timeId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao deletar time");
  return response.json();
};
