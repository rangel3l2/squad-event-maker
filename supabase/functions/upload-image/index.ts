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
        JSON.stringify({ error: "Authentication required" }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify user identity
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }), 
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Uploading image for user:", user.id);

    const { base64Image } = await req.json();

    if (!base64Image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate image size (max 5MB)
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;
    
    const imageSizeBytes = (base64Data.length * 3) / 4;
    const imageSizeMB = imageSizeBytes / (1024 * 1024);
    
    if (imageSizeMB > 5) {
      return new Response(
        JSON.stringify({ error: "Image too large. Maximum size is 5MB." }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Detect mime/extension from the data URL prefix
    const mimeMatch = /^data:([a-zA-Z0-9/+.-]+);base64,/.exec(base64Image);
    const mimeType = mimeMatch?.[1] ?? 'image/png';
    const ext = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');

    const binary = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const formData = new FormData();
    formData.append('files', new Blob([binary], { type: mimeType }), `upload-${Date.now()}.${ext}`);

    const response = await fetch('https://frontendteamscup.com.br/static/upload-static', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Static upload error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload image" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();
    const filePath = result?.files?.[0]?.url;

    if (!filePath) {
      console.error('Static upload failed:', result);
      return new Response(
        JSON.stringify({ error: "Image upload failed" }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const finalUrl = filePath.startsWith('http')
      ? filePath
      : `https://frontendteamscup.com.br${filePath.startsWith('/') ? '' : '/'}${filePath}`;

    console.log('Image uploaded successfully:', finalUrl);

    return new Response(
      JSON.stringify({ 
        url: finalUrl,
        display_url: finalUrl 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("upload-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
