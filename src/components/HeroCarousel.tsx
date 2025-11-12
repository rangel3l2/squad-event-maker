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
    "/assets/WhatsApp%20Image%202025-11-11%20at%2023.42.51.jpeg",
    "/assets/WhatsApp%20Image%202025-11-12%20at%2000.10.12%20(1).jpeg",
    "/assets/WhatsApp%20Image%202025-11-12%20at%2000.10.12%20(2).jpeg",
    "/assets/WhatsApp%20Image%202025-11-12%20at%2000.10.12.jpeg",
    "/assets/WhatsApp%20Image%202025-11-12%20at%2000.10.13.jpeg",
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
