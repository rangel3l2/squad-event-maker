import { useEffect, useState } from "react";
import { listarTimes } from "@/services/api";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

interface Time {
  id?: number;
  nome_time: string;
  dono_id: number;
  senha_convite?: string;
  imagem_time?: string;
  integrantes?: any[];
}

export const TeamsDashboard = () => {
  const [times, setTimes] = useState<Time[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimes();
  }, []);

  const fetchTimes = async () => {
    try {
      const timesData = await listarTimes();
      setTimes(timesData);
    } catch (error) {
      console.error("Erro ao carregar times:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-muted-foreground">Carregando times...</p>
      </div>
    );
  }

  if (times.length === 0) {
    return (
      <div className="w-full py-12 text-center">
        <p className="text-muted-foreground">Nenhum time cadastrado ainda. Seja o primeiro!</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-center gap-3 mb-8">
        <Users className="h-10 w-10 text-primary" />
        <h2 className="text-3xl md:text-4xl font-bold text-center">
          Times Cadastrados
        </h2>
      </div>
      
      <Carousel
        plugins={[
          Autoplay({
            delay: 3000,
            stopOnInteraction: true,
          }),
        ]}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {times.map((time) => (
            <CarouselItem key={time.id} className="md:basis-1/2 lg:basis-1/3">
              <div className="p-2">
                <Card className="hover:shadow-glow transition-all duration-300 hover:scale-105">
                  <CardHeader className="pb-4">
                    {time.imagem_time ? (
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20">
                        <img
                          src={time.imagem_time}
                          alt={time.nome_time}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Users className="w-12 h-12 text-primary-foreground" />
                      </div>
                    )}
                    <CardTitle className="text-center text-xl">
                      {time.nome_time}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Badge variant="secondary" className="text-sm">
                      <Users className="w-3 h-3 mr-1" />
                      {time.integrantes?.length || 0} membros
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
};
