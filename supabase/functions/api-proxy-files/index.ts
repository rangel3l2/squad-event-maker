import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://twfbsgbydjuhqjjkhodv.lovableproject.com',
    'http://localhost:5173',
    'http://localhost:8080',
  ];
  const isAllowed = allowedOrigins.includes(origin) || /^https:\/\/([a-z0-9-]+\.)*(lovable\.app|lovableproject\.com|lovable\.dev|vercel\.app)$/.test(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

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
    
    const apiUrl = `https://frontendteamscup.com.br/api/baixar-pastas-pares?code_pasta=${encodeURIComponent(codePasta)}`;
    console.log('Fazendo requisição para:', apiUrl);
    
    const response = await fetch(apiUrl);
    
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
