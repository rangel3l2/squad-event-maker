import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

export const HeroCarousel = () => {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    // Importar todas as imagens da pasta assets
    const loadImages = async () => {
      const imageModules = import.meta.glob<{ default: string }>(
        "/public/assets/*.{jpeg,jpg,png,gif}",
        { eager: true }
      );
      
      const imageArray = Object.values(imageModules).map((module) => module.default);
      setImages(imageArray);
    };

    loadImages();
  }, []);

  if (images.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border shadow-card bg-muted flex items-center justify-center">
          <p className="text-muted-foreground">Carregando imagens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Carousel
        plugins={[
          Autoplay({
            delay: 4000,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border shadow-card bg-muted">
                <img
                  src={image}
                  alt={`Carousel Image ${index + 1}`}
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-4" />
        <CarouselNext className="right-4" />
      </Carousel>
    </div>
  );
};
