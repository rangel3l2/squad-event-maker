import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";
import JSZip from "https://esm.sh/jszip@3.10.1";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'https://twfbsgbydjuhqjjkhodv.lovableproject.com',
    'http://localhost:5173',
    'http://localhost:8080',
  ];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    let codePasta: string | null = null;
    
    // Try to get from body (POST) first
    if (req.method === 'POST') {
      const body = await req.json();
      codePasta = body.code_pasta;
    }
    
    // If not in body, try query parameter (GET)
    if (!codePasta) {
      const url = new URL(req.url);
      codePasta = url.searchParams.get('code_pasta');
    }
    
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
    
    const apiUrl = `https://ifms.pro.br:6005/obter-gif?code_pasta=${encodeURIComponent(codePasta)}`;
    console.log('Fazendo requisição para:', apiUrl);
    
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
    
    console.log('Resposta recebida, processando ZIP...');
    
    // Download ZIP as ArrayBuffer
    const zipBuffer = await response.arrayBuffer();
    console.log('ZIP baixado, tamanho:', zipBuffer.byteLength);
    
    // Extract GIF from ZIP
    const zip = await JSZip.loadAsync(zipBuffer);
    console.log('ZIP carregado, arquivos:', Object.keys(zip.files));
    
    // Find GIF file in ZIP
    let gifFile = null;
    for (const fileName in zip.files) {
      if (fileName.toLowerCase().endsWith('.gif')) {
        gifFile = zip.files[fileName];
        console.log('GIF encontrado:', fileName);
        break;
      }
    }
    
    if (!gifFile) {
      console.log('Nenhum arquivo GIF encontrado no ZIP');
      return new Response(
        JSON.stringify({ gif: null }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Extract GIF as base64
    const gifBlob = await gifFile.async('base64');
    const gifDataUrl = `data:image/gif;base64,${gifBlob}`;
    console.log('GIF extraído e convertido para base64');
    
    return new Response(
      JSON.stringify({ gif: gifDataUrl }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Erro ao buscar GIF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ gif: null, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
