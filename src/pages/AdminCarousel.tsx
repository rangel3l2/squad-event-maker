import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";

interface CarouselImage {
  id: string;
  image_url: string;
  video_url?: string;
  media_type: string;
  display_order: number;
  is_active: boolean;
}

const AdminCarousel = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "admin") {
      navigate("/");
      return;
    }
    fetchImages();
  }, [user, role, navigate]);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("carousel_images")
      .select("*")
      .order("display_order");

    if (!error && data) {
      setImages(data);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'video') => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("carousel-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("carousel-images")
        .getPublicUrl(filePath);

      const maxOrder = images.length > 0 ? Math.max(...images.map(img => img.display_order)) : -1;

      const insertData: any = {
        display_order: maxOrder + 1,
        is_active: true,
        media_type: mediaType,
      };

      if (mediaType === 'image') {
        insertData.image_url = publicUrl;
      } else {
        insertData.video_url = publicUrl;
      }

      const { error: dbError } = await supabase
        .from("carousel_images")
        .insert(insertData);

      if (dbError) throw dbError;

      toast.success(`${mediaType === 'image' ? 'Imagem' : 'Vídeo'} adicionado com sucesso!`);
      fetchImages();
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    const fileName = imageUrl.split("/").pop();
    
    const { error: storageError } = await supabase.storage
      .from("carousel-images")
      .remove([fileName!]);

    if (storageError) {
      toast.error("Erro ao remover arquivo");
      return;
    }

    const { error } = await supabase
      .from("carousel_images")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover imagem");
    } else {
      toast.success("Imagem removida");
      fetchImages();
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = images.findIndex(img => img.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    [newImages[currentIndex], newImages[targetIndex]] = [newImages[targetIndex], newImages[currentIndex]];

    const updates = newImages.map((img, index) => ({
      id: img.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("carousel_images")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    fetchImages();
    toast.success("Ordem atualizada");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Carrossel</h1>
            <p className="text-muted-foreground">
              Adicione e organize as imagens do carrossel da página inicial
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Adicionar Nova Mídia</CardTitle>
              <CardDescription>
                Selecione uma imagem, GIF ou vídeo para adicionar ao carrossel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="image">Imagem / GIF</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUpload(e, 'image')}
                    disabled={uploading}
                  />
                </div>
                <div>
                  <Label htmlFor="video">Vídeo</Label>
                  <Input
                    id="video"
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleUpload(e, 'video')}
                    disabled={uploading}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Imagens do Carrossel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {images.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma imagem adicionada ainda
                  </p>
                ) : (
                  images.map((image, index) => (
                    <div
                      key={image.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      {image.media_type === 'video' ? (
                        <video
                          src={image.video_url}
                          className="w-32 h-20 object-cover rounded"
                          controls
                        />
                      ) : (
                        <img
                          src={image.image_url}
                          alt="Carousel"
                          className="w-32 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          Posição {index + 1} - {image.media_type === 'video' ? 'Vídeo' : 'Imagem'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(image.id, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(image.id, "down")}
                          disabled={index === images.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(image.id, image.image_url)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCarousel;
