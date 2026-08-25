import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import videoCopa from "@/assets/videoCopa2026.webm";
import { SedesShowcase } from "@/components/SedesShowcase";
import { MapPin, Trophy, Users, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

type Slide =
  | { type: "video"; src: string }
  | { type: "image"; src: string }
  | { type: "sedes" }
  | { type: "promo" };

const sedesPins = [
  { top: "18%", left: "75%", label: "Nordeste" },
  { top: "55%", left: "52%", label: "Centro-Oeste" },
  { top: "68%", left: "42%", label: "Sudeste" },
  { top: "78%", left: "30%", label: "Sul" },
  { top: "32%", left: "22%", label: "Norte" },
];

const BrasilPromoSlide = () => {
  const navigate = useNavigate();

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6 md:p-10 flex flex-col items-center justify-center text-center">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <circle cx="650" cy="160" r="6" fill="currentColor" className="text-primary" />
          <circle cx="430" cy="300" r="6" fill="currentColor" className="text-primary" />
          <circle cx="350" cy="380" r="6" fill="currentColor" className="text-primary" />
          <circle cx="260" cy="450" r="6" fill="currentColor" className="text-primary" />
          <circle cx="180" cy="200" r="6" fill="currentColor" className="text-primary" />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
          <Trophy className="w-4 h-4" />
          Copa 2026
        </div>

        <h3 className="text-2xl md:text-4xl font-bold leading-tight">
          Em todo o Brasil, uma só competição
        </h3>

        <p className="text-base md:text-lg text-muted-foreground">
          A competição chega a múltiplas sedes em 2026. Faça parte do maior evento de futebol entre turmas de desenvolvimento web do país.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 py-2">
          {sedesPins.map((pin, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-full bg-card/80 border border-border px-3 py-1 text-xs font-medium shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-primary" />
              {pin.label}
            </div>
          ))}
        </div>

        <Button onClick={() => navigate("/auth")} size="lg" className="h-12 px-6 text-base gap-2">
          <Users className="w-5 h-5" />
          Inscreva-se agora
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const HeroCarousel = () => {
  const { user, loading } = useAuth();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const slides: Slide[] = [
    { type: "video", src: videoCopa },
    loading ? { type: "promo" } : user ? { type: "sedes" } : { type: "promo" },
  ];

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
  }, [current, slides]);

  // When the video finishes, advance to the next slide
  const handleEnded = useCallback(() => {
    if (!api) return;
    if (slides.length > 1) api.scrollNext();
    else videoRef.current?.play().catch(() => {});
  }, [api, slides.length]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <Carousel setApi={setApi} className="w-full group" opts={{ loop: slides.length > 1 }}>
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
                ) : slide.type === "sedes" ? (
                  <SedesShowcase />
                ) : slide.type === "promo" ? (
                  <BrasilPromoSlide />
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
            <button
              type="button"
              onClick={() => api?.scrollPrev()}
              aria-label="Slide anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-primary border border-border/60 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => api?.scrollNext()}
              aria-label="Próximo slide"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-background/80 text-primary border border-border/60 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => api?.scrollTo(index)}
                  aria-label={`Ir para slide ${index + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all duration-200",
                    current === index
                      ? "w-6 bg-primary shadow-md"
                      : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>
    </div>
  );
};
