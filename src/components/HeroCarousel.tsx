import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface CarouselImage {
  id: string;
  image_url: string;
  video_url?: string;
  media_type: string;
  display_order: number;
}

export const HeroCarousel = () => {
  const [images, setImages] = useState<CarouselImage[]>([]);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    const { data, error } = await supabase
      .from("carousel_images")
      .select("*")
      .eq("is_active", true)
      .order("display_order");

    if (!error && data) {
      setImages(data);
    }
  };

  if (images.length === 0) return null;

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
          {images.map((image) => (
            <CarouselItem key={image.id}>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border shadow-card">
                {image.media_type === 'video' ? (
                  <video
                    src={image.video_url}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={image.image_url}
                    alt="Frontend Teams Cup"
                    className="w-full h-full object-cover"
                  />
                )}
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
