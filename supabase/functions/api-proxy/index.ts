import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const API_BASE_URL = "https://frontendteamscup.com.br/api";

// Allowed path prefixes for SSRF protection
const ALLOWED_PATH_PREFIXES = [
  '/usuarios',
  '/times',
  '/time/',
  '/eventos/',
  '/baixar-pastas-pares',
  '/uploads/',
  '/obter-gif',
];

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight requests
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
    const path = url.searchParams.get('path') || '';
    const method = req.method;

    // SSRF protection: Validate path
    if (path.includes('..') || path.includes('//')) {
      return new Response(
        JSON.stringify({ error: 'Invalid path' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if path is in allowed list
    const isAllowedPath = ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
    if (!isAllowedPath && path !== '' && path !== '/') {
      console.log('Blocked path:', path);
      return new Response(
        JSON.stringify({ error: 'Path not allowed' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Construct the target URL
    const targetUrl = `${API_BASE_URL}${path}`;
    console.log('Proxying request to:', targetUrl, 'Method:', method);

    // Determine content type from request
    const requestContentType = req.headers.get('content-type') || 'application/json';
    
    const headers: Record<string, string> = {
      'Content-Type': requestContentType,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    // Forward body for POST, PUT, PATCH, DELETE requests
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const body = await req.text();
      if (body) {
        options.body = body;
      }
    }

    const response = await fetch(targetUrl, options);
    
    // Get response content type
    const responseContentType = response.headers.get('content-type') || 'application/json';
    
    // Handle different response types
    if (responseContentType.includes('application/json')) {
      const data = await response.text();
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    } else {
      // For binary data or other content types, pass through as-is
      const data = await response.arrayBuffer();
      return new Response(data, {
        status: response.status,
        headers: {
          ...corsHeaders,
          'Content-Type': responseContentType,
        },
      });
    }
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
