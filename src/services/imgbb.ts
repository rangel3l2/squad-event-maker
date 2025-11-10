const IMGBB_API_KEY = "5e705342ac5da081236065212f37307c";
const IMGBB_API_URL = "https://api.imgbb.com/1/upload";

interface ImgBBResponse {
  data: {
    image: {
      url: string;
    };
    url: string;
    display_url: string;
  };
  success: boolean;
  status: number;
}

export const uploadImageToImgBB = async (base64Image: string): Promise<string> => {
  try {
    // Remove o prefixo data:image/...;base64, se existir
    const base64Data = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;

    const formData = new FormData();
    formData.append('image', base64Data);

    const response = await fetch(`${IMGBB_API_URL}?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao fazer upload no ImgBB:', errorText);
      throw new Error(`Erro no upload: ${response.status}`);
    }

    const result: ImgBBResponse = await response.json();

    if (!result.success) {
      throw new Error('Upload falhou no ImgBB');
    }

    console.log('Upload ImgBB bem-sucedido:', result.data.image.url);
    return result.data.image.url;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw error;
  }
};
