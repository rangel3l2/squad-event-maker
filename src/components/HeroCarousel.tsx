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

export const HeroCarousel = () => {
  const images = [
    "/assets/WhatsApp Image 2025-11-11 at 23.42.51.jpeg",
    "/assets/WhatsApp Image 2025-11-12 at 00.10.12 (1).jpeg",
    "/assets/WhatsApp Image 2025-11-12 at 00.10.12 (2).jpeg",
    "/assets/WhatsApp Image 2025-11-12 at 00.10.12.jpeg",
    "/assets/WhatsApp Image 2025-11-12 at 00.10.13.jpeg",
  ];

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
