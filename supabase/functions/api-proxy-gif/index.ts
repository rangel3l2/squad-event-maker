import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let codePasta: string | null = null;
    
    // Tentar pegar do body (POST) primeiro
    if (req.method === 'POST') {
      const body = await req.json();
      codePasta = body.code_pasta;
    }
    
    // Se não tiver no body, tentar query parameter (GET)
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
    
    // Baixar o ZIP como ArrayBuffer
    const zipBuffer = await response.arrayBuffer();
    console.log('ZIP baixado, tamanho:', zipBuffer.byteLength);
    
    // Extrair o GIF do ZIP
    const zip = await JSZip.loadAsync(zipBuffer);
    console.log('ZIP carregado, arquivos:', Object.keys(zip.files));
    
    // Procurar arquivo GIF no ZIP
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
    
    // Extrair o GIF como base64
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
