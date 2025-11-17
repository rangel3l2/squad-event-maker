const TV_API_BASE_URL = "https://ifms.pro.br:6005";

export interface ArquivoTV {
  arquivo: string;
  url: string;
  ultima_modificacao: string;
}

export interface DadosTV {
  base: string;
  arquivos: ArquivoTV[];
}

export const buscarDadosTV = async (codePasta: string): Promise<DadosTV> => {
  const response = await fetch(`${TV_API_BASE_URL}/baixar-pastas-pares?code_pasta=${encodeURIComponent(codePasta)}`);
  
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados TV: ${response.status}`);
  }
  
  return response.json();
};

export const extrairImagens = (dados: DadosTV) => {
  const arquivos = dados.arquivos;
  
  return {
    imagemPrincipal: arquivos.find(a => a.arquivo.match(/^\d+_\d+_\d+x\d+\.png$/))?.url,
    imagensPares: arquivos
      .filter(a => a.arquivo.includes('_Par_') && a.arquivo.endsWith('.png'))
      .sort((a, b) => {
        const numA = parseInt(a.arquivo.match(/_Par_(\d+)/)?.[1] || '0');
        const numB = parseInt(b.arquivo.match(/_Par_(\d+)/)?.[1] || '0');
        return numA - numB;
      })
      .map(a => a.url),
    imagemResultadoFinal: arquivos.find(a => a.arquivo.includes('resultado_final'))?.url,
    pontuacaoUrl: arquivos.find(a => a.arquivo.endsWith('_pontuacao.txt'))?.url,
    ultimaAtualizacao: arquivos.find(a => a.arquivo.match(/^\d+_\d+_\d+x\d+\.png$/))?.ultima_modificacao,
  };
};
