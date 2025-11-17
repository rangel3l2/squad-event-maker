// Direct HTTPS connection to external API
const API_BASE_URL = "https://ifms.pro.br:6003";

const makeRequest = async (path: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${path}`;
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
  } as Record<string, string>;
  console.log("=== makeRequest ===");
  console.log("URL:", url);
  console.log("Method:", options?.method);
  console.log("Body:", options?.body);
  console.log("Headers (final):", finalHeaders);
  
  return fetch(url, {
    ...options,
    headers: finalHeaders,
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

export interface Dinamica {
  evento: string;
  tipo: number;
  status: boolean;
  code_pasta: string;
  configuracao: {
    id: number;
    margin_cor: number;
    peso_cor: number;
    margin_distancia: number;
    peso_distancia: number;
    margin_tamanho: number;
    peso_tamanho: number;
    penalidade: number;
    nome: string[];
    descr: string;
  } | null;
}

export interface ArquivoDinamica {
  nome: string;
  url: string;
  tipo: 'imagem' | 'texto' | 'css' | 'html' | 'gif' | 'outro';
  extensao: string;
}

export interface TimeDinamicas {
  time: {
    id: number;
    nome_time: string;
    imagem_time: string;
    imagem_url: string;
    integrantes: Array<{
      id: number;
      nome: string;
      url_image_perfil: string;
      imagem_url: string;
    }>;
  };
  dinamicas: Dinamica[];
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

  console.log("=== RESPOSTA mostrarTimeUsuario ===");
  console.log("Dados completos da API:", data);
  console.log("data.time:", data?.time);
  console.log("data.integrantes:", data?.integrantes);
  
  const baseTime = (data && typeof data === 'object' ? (data.time || data) : {}) || {};
  let integrantes = Array.isArray(data?.integrantes)
    ? data.integrantes
    : Array.isArray((baseTime as any).integrantes)
      ? (baseTime as any).integrantes
      : [];

  // Se não vier a lista mas houver id do time, buscar detalhes do time
  if ((!integrantes || integrantes.length === 0) && (baseTime as any)?.id) {
    try {
      const detResp = await makeRequest(`/times/${(baseTime as any).id}`);
      if (detResp.ok) {
        const det = await detResp.json();
        integrantes = Array.isArray(det?.integrantes) ? det.integrantes : [];
        console.log("Integrantes carregados via fallback /times/:id:", integrantes);
      }
    } catch (e) {
      console.warn("Falha no fallback de integrantes:", e);
    }
  }

  const qtd = (baseTime as any)?.qtd_integrantes ?? (baseTime as any)?.quantidade ?? (integrantes?.length || 0);

  return {
    ...(baseTime || {}),
    integrantes: integrantes || [],
    qtd_integrantes: qtd,
  } as Time;
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
  
  console.log("=== RESPOSTA mostrarTime ===");
  console.log("Dados completos da API:", data);
  console.log("data.time:", data?.time);
  console.log("data.integrantes:", data?.integrantes);
  
  const baseTime = (data && typeof data === 'object' ? (data.time || data) : {}) || {};
  const integrantes = Array.isArray(data?.integrantes)
    ? data.integrantes
    : Array.isArray((baseTime as any).integrantes)
      ? (baseTime as any).integrantes
      : [];

  const qtd = (baseTime as any)?.qtd_integrantes ?? (baseTime as any)?.quantidade ?? (integrantes?.length || 0);

  return {
    ...(baseTime || {}),
    integrantes: integrantes || [],
    qtd_integrantes: qtd,
  } as Time;
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

// Nova função para transferir liderança manualmente
export const transferirLideranca = async (timeId: number, novoLiderId: number) => {
  console.log("=== TRANSFERINDO LIDERANÇA ===");
  console.log("Time ID:", timeId);
  console.log("Novo Líder ID:", novoLiderId);
  
  // Atualizar o dono do time
  await atualizarTime(timeId, {
    dono_id: novoLiderId
  });
  
  console.log("Liderança transferida com sucesso");
  
  return { 
    success: true, 
    message: "Liderança transferida com sucesso" 
  };
};

// Nova função para gerenciar saída de membro com transferência de liderança
export const sairDoTime = async (timeId: number, usuarioId: number) => {
  console.log("=== INICIANDO SAÍDA DO TIME ===");
  console.log("Time ID:", timeId);
  console.log("Usuário ID:", usuarioId);
  
  // Buscar informações do time
  const time = await mostrarTime(timeId);
  console.log("Time encontrado:", time);
  console.log("Dono do time:", time.dono_id);
  console.log("Integrantes do time:", time.integrantes);
  
  const isDono = time.dono_id === usuarioId;
  console.log("Usuário é dono?", isDono);
  
  if (isDono) {
    // Se é o dono, verificar quantos integrantes tem
    const outrosIntegrantes = (time.integrantes as any[])?.filter(
      (i: any) => (i.usuario_id ?? i.id) !== usuarioId
    ) || [];
    
    console.log("Outros integrantes:", outrosIntegrantes);
    
    if (outrosIntegrantes.length > 0) {
      // Transferir liderança para o primeiro integrante
      const novoLider = outrosIntegrantes[0];
      const novoLiderId = (novoLider as any).usuario_id ?? (novoLider as any).id;
      
      console.log("Transferindo liderança para:", novoLiderId);
      
      // Atualizar o dono do time
      await atualizarTime(timeId, {
        dono_id: novoLiderId
      });
      
      console.log("Liderança transferida com sucesso");
      
      // Atualizar função do novo líder para "Líder"
      try {
        // Primeiro remover o antigo líder
        await removerIntegrante(timeId, usuarioId);
        
        // Atualizar a função do novo líder se necessário
        // A API pode não ter endpoint para isso, então apenas logamos
        console.log("Integrante removido. Novo líder:", novoLiderId);
      } catch (error) {
        console.error("Erro ao remover integrante:", error);
        throw error;
      }
      
      return { 
        success: true, 
        message: "Liderança transferida com sucesso",
        novoLiderId 
      };
    } else {
      // Sem outros integrantes, deletar o time
      console.log("Sem outros integrantes. Deletando time...");
      await deletarTime(timeId);
      console.log("Time deletado com sucesso");
      
      return { 
        success: true, 
        message: "Time deletado com sucesso" 
      };
    }
  } else {
    // Não é dono, apenas remover
    console.log("Usuário não é dono. Removendo do time...");
    await removerIntegrante(timeId, usuarioId);
    console.log("Integrante removido com sucesso");
    
    return { 
      success: true, 
      message: "Você saiu do time com sucesso" 
    };
  }
};

export const deletarTime = async (timeId: number) => {
  const response = await makeRequest(`/times/${timeId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao deletar time");
  return response.json();
};

export const atualizarTime = async (timeId: number, time: Partial<Time>): Promise<Time> => {
  const params = new URLSearchParams();
  if (time.nome_time !== undefined) params.set('nome_time', time.nome_time);
  if (time.senha_convite !== undefined) params.set('senha_convite', time.senha_convite);
  if (time.imagem_time !== undefined) params.set('imagem_time', time.imagem_time);

  console.log("=== API atualizarTime ===");
  console.log("Time ID:", timeId);
  console.log("Dados para atualizar:", time);
  console.log("URLSearchParams:", params.toString());

  const response = await makeRequest(`/times/${timeId}`, {
    method: "PUT",
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API:", errorText);
    throw new Error(`Erro ao atualizar time: ${response.status} - ${errorText}`);
  }
  
  return response.json();
};

export const deletarUsuario = async (usuarioId: number, confirmacao: string) => {
  console.log("=== DELETANDO USUÁRIO ===");
  console.log("Usuario ID:", usuarioId);
  
  // Primeiro, buscar todos os times
  const times = await listarTimes();
  console.log("Total de times encontrados:", times.length);
  
  // Para cada time, verificar se o usuário está como integrante
  for (const time of times) {
    if (!time.id) continue;
    
    try {
      // Buscar detalhes do time incluindo integrantes
      const timeDetalhado = await mostrarTime(time.id);
      const integrantes = timeDetalhado.integrantes || [];
      
      // Verificar se o usuário está neste time
      const integranteEncontrado = integrantes.find(
        (i: any) => (i.usuario_id ?? i.id) === usuarioId
      );
      
      if (integranteEncontrado) {
        console.log(`Usuário encontrado no time: ${time.nome_time} (ID: ${time.id})`);
        console.log("Função do usuário:", integranteEncontrado.funcao);
        
        // Se for líder, deletar o time inteiro
        if (integranteEncontrado.funcao === "Líder" || time.dono_id === usuarioId) {
          console.log("Usuário é líder. Deletando time...");
          await deletarTime(time.id);
          console.log(`Time ${time.nome_time} deletado`);
        } else {
          // Se for membro, apenas remover do time
          console.log("Usuário é membro. Removendo do time...");
          await removerIntegrante(time.id, usuarioId);
          console.log(`Usuário removido do time ${time.nome_time}`);
        }
      }
    } catch (error) {
      console.warn(`Erro ao processar time ${time.id}:`, error);
      // Continua para os próximos times mesmo se houver erro
    }
  }
  
  // Agora deletar o usuário
  console.log("Todos os times processados. Deletando usuário...");
  const response = await makeRequest(`/usuarios/${usuarioId}?confirmacao=${confirmacao}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Erro ao deletar usuário");
  
  console.log("Usuário deletado com sucesso!");
  return response.json();
};

// Buscar times por dono
export const buscarTimesPorDono = async (donoId: number): Promise<Time[]> => {
  const times = await listarTimes();
  return times.filter(t => t.dono_id === donoId);
};

export const transferirDono = async (timeId: number, novoDonoId: number): Promise<void> => {
  console.log("=== API transferirDono ===");
  console.log("Time ID:", timeId);
  console.log("Novo Dono ID:", novoDonoId);

  const response = await makeRequest(`/times/${timeId}/transferir-dono?novo_dono_id=${novoDonoId}`, {
    method: "PUT",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API:", errorText);
    throw new Error(`Erro ao transferir dono: ${response.status} - ${errorText}`);
  }

  console.log("Dono transferido com sucesso");
};

export const buscarDinamicasTime = async (timeId: number): Promise<TimeDinamicas> => {
  console.log("=== API buscarDinamicasTime ===");
  console.log("Time ID:", timeId);

  // Usar edge function como proxy para evitar erro de SSL
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const url = `${SUPABASE_URL}/functions/v1/api-proxy-dinamicas?time_id=${timeId}`;
  console.log("URL completa:", url);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro da API:", errorText);
    throw new Error(`Erro ao buscar dinâmicas: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log("Dinâmicas encontradas:", data);
  return data;
};

// Buscar arquivos de uma dinâmica específica
export const buscarImagensDinamica = async (codePasta: string): Promise<ArquivoDinamica[]> => {
  console.log("=== API buscarImagensDinamica ===");
  console.log("Code Pasta:", codePasta);

  // Usar edge function como proxy para evitar erro de SSL
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const url = `${SUPABASE_URL}/functions/v1/api-proxy-files?code_pasta=${encodeURIComponent(codePasta)}`;
  console.log("URL completa:", url);
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Erro ao buscar arquivos:", errorText);
    throw new Error(`Erro ao buscar arquivos: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("Dados recebidos:", data);
  
  // Se data não for um array, transforma em array
  const arquivos = Array.isArray(data) ? data : [data];
  
  // Processar cada arquivo para determinar seu tipo
  const arquivosProcessados: ArquivoDinamica[] = arquivos.map((item: any) => {
    const nome = item.nome || item.name || 'arquivo';
    const url = item.url || item;
    const extensao = nome.split('.').pop()?.toLowerCase() || '';
    
    let tipo: 'imagem' | 'texto' | 'css' | 'html' | 'gif' | 'outro' = 'outro';
    
    if (extensao === 'gif') {
      tipo = 'gif';
    } else if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(extensao)) {
      tipo = 'imagem';
    } else if (['txt', 'md'].includes(extensao)) {
      tipo = 'texto';
    } else if (extensao === 'css') {
      tipo = 'css';
    } else if (['html', 'htm'].includes(extensao)) {
      tipo = 'html';
    }
    
    return {
      nome,
      url: typeof url === 'string' ? url : url.url || '',
      tipo,
      extensao
    };
  });
  
  console.log("Arquivos processados:", arquivosProcessados);
  return arquivosProcessados;
};

// Buscar GIF da dinâmica
export const buscarGifDinamica = async (codePasta: string): Promise<string | null> => {
  console.log("=== API buscarGifDinamica ===");
  console.log("Code Pasta:", codePasta);

  // Usar edge function como proxy para evitar erro de SSL
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const url = `${SUPABASE_URL}/functions/v1/api-proxy-gif?code_pasta=${encodeURIComponent(codePasta)}`;
  console.log("URL completa:", url);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    if (!response.ok) {
      console.log("GIF não encontrado ou erro na requisição");
      return null;
    }

    const data = await response.json();
    console.log("GIF recebido:", data);
    
    // Retorna a URL do GIF se existir
    return data?.gif || data?.url || null;
  } catch (error) {
    console.error("Erro ao buscar GIF:", error);
    return null;
  }
};
