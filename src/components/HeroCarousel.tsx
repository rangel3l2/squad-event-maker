import { useCallback, useEffect, useRef, useState } from "react";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import videoCopa from "@/assets/videoCopa2026.webm.asset.json";
import { SedesShowcase } from "@/components/SedesShowcase";

type Slide = { type: "video"; src: string } | { type: "image"; src: string } | { type: "sedes" };

const slides: Slide[] = [{ type: "video", src: videoCopa.url }, { type: "sedes" }];

export const HeroCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Play/pause the video depending on whether its slide is visible
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const videoIndex = slides.findIndex((s) => s.type === "video");
    if (current === videoIndex) {
      video.currentTime = 0;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [current]);

  // When the video finishes, advance to the next slide
  const handleEnded = useCallback(() => {
    if (!api) return;
    if (slides.length > 1) api.scrollNext();
    else videoRef.current?.play().catch(() => {});
  }, [api]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Carousel setApi={setApi} className="w-full" opts={{ loop: slides.length > 1 }}>
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border shadow-card bg-muted">
                {slide.type === "video" ? (
                  <video
                    ref={videoRef}
                    src={slide.src}
                    className="w-full h-full object-contain"
                    autoPlay
                    muted
                    playsInline
                    controls
                    onEnded={handleEnded}
                  />
                ) : (
                  <img
                    src={slide.src}
                    alt={`Copa 2026 - imagem ${index + 1}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {slides.length > 1 && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
};
