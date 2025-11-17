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

    console.log('Buscando GIF para pasta:', codePasta);
    
    // Fazer requisição para a API externa
    const apiUrl = `https://ifms.pro.br:6005/obter-gif?code_pasta=${encodeURIComponent(codePasta)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.log('GIF não encontrado');
      return new Response(
        JSON.stringify({ gif: null }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const data = await response.json();
    console.log('GIF obtido');
    
    return new Response(
      JSON.stringify(data),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erro ao buscar GIF:', error);
    return new Response(
      JSON.stringify({ gif: null }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
