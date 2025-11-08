import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";

interface CarouselImage {
  id: string;
  image_url: string;
  media_type: string;
  display_order: number;
}

// Dados mockados
const mockImages: CarouselImage[] = [
  {
    id: "1",
    image_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800",
    media_type: "image",
    display_order: 0,
  },
  {
    id: "2",
    image_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
    media_type: "image",
    display_order: 1,
  },
  {
    id: "3",
    image_url: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=800",
    media_type: "image",
    display_order: 2,
  },
];

const AdminCarousel = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [images, setImages] = useState<CarouselImage[]>(mockImages);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "admin") {
      navigate("/");
      return;
    }
  }, [user, role, navigate]);

  const handleReorder = (id: string, direction: "up" | "down") => {
    const currentIndex = images.findIndex(img => img.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newImages = [...images];
    [newImages[currentIndex], newImages[targetIndex]] = [newImages[targetIndex], newImages[currentIndex]];
    setImages(newImages);
  };

  const handleDelete = (id: string) => {
    setImages(images.filter(img => img.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Carrossel</h1>
            <p className="text-muted-foreground">
              Visualização mockada das imagens do carrossel
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Imagens do Carrossel (Mock)</CardTitle>
              <CardDescription>
                Dados simulados para demonstração
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    <img
                      src={image.image_url}
                      alt="Carousel"
                      className="w-32 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Posição {index + 1}
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
                        onClick={() => handleDelete(image.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminCarousel;
