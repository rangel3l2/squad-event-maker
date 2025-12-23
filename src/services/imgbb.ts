import { supabase } from "@/integrations/supabase/client";

interface UploadResponse {
  url: string;
  display_url: string;
}

export const uploadImageToImgBB = async (base64Image: string): Promise<string> => {
  try {
    console.log('Uploading image via edge function...');

    const { data, error } = await supabase.functions.invoke<UploadResponse>('upload-image', {
      body: { base64Image }
    });

    if (error) {
      console.error('Upload error:', error);
      throw new Error(error.message || 'Failed to upload image');
    }

    if (!data?.url) {
      throw new Error('No URL returned from upload');
    }

    console.log('Upload successful:', data.url);
    return data.url;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};
