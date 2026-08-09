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

    // Verify user identity - not just presence of auth header
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

    console.log("Generating logo for user:", user.id);

    const { prompt, teamName, baseImage } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("generateImageGemini");
    
    if (!GEMINI_API_KEY) {
      throw new Error("generateImageGemini API key is not configured");
    }

    console.log("Generating logo for team:", teamName);
    console.log("Has base image:", !!baseImage);

    const enhancedPrompt = `Create a professional sports team logo for "${teamName}". ${prompt}. The logo should be: modern, bold, suitable for a sports team, with clear shapes and strong colors. Make it simple enough to work at small sizes but detailed enough to be interesting. Centered composition on transparent or white background.`;

    // Prepare the request body for Gemini API
    const requestBody: any = {
      contents: [
        {
          parts: []
        }
      ],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    };

    // Add text prompt
    requestBody.contents[0].parts.push({
      text: enhancedPrompt
    });

    // Add base image if provided
    if (baseImage) {
      // Remove data URL prefix if present
      const base64Data = baseImage.includes(',') ? baseImage.split(',')[1] : baseImage;
      
      requestBody.contents[0].parts.push({
        inline_data: {
          mime_type: "image/png",
          data: base64Data
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${response.status}` }), 
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("Logo generated successfully");

    // Extract the base64 image from the response
    const parts = data.candidates?.[0]?.content?.parts;
    let imageData = null;

    if (parts) {
      for (const part of parts) {
        if (part.inline_data) {
          imageData = part.inline_data.data;
          break;
        }
      }
    }

    if (!imageData) {
      throw new Error("No image data in response");
    }

    // Return the image as base64 data URL
    const imageUrl = `data:image/png;base64,${imageData}`;

    return new Response(
      JSON.stringify({ imageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-logo error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), 
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      }
    );
  }
});
