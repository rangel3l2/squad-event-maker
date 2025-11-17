import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const codePasta = url.searchParams.get('code_pasta');
    
    if (!codePasta) {
      return new Response(
        JSON.stringify({ error: 'code_pasta é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Buscando arquivos para pasta:', codePasta);
    
    const httpsUrl = `https://ifms.pro.br:6005/baixar-pastas-pares?code_pasta=${encodeURIComponent(codePasta)}`;
    const httpUrl = `http://ifms.pro.br:6005/baixar-pastas-pares?code_pasta=${encodeURIComponent(codePasta)}`;

    let response: Response | null = null;
    try {
      console.log('Tentando via HTTPS:', httpsUrl);
      response = await fetch(httpsUrl);
    } catch (e) {
      console.warn('Falha no HTTPS, tentando HTTP sem TLS:', String(e));
    }

    if (!response) {
      console.log('Tentando via HTTP:', httpUrl);
      response = await fetch(httpUrl);
    }
    
    if (!response.ok) {
      throw new Error(`Erro da API: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Arquivos obtidos');
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erro ao buscar arquivos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
