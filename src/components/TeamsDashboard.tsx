import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listarTimesComIntegrantes, listarSedesPorEvento, listarUsuarios, EVENTO_ATUAL, type Sede, type Time, type Usuario } from "@/services/api";
import { TeamCard } from "@/components/teams/TeamCard";
import { useAuth } from "@/contexts/AuthContext";
import { getSavedLocation } from "@/hooks/useUserLocation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MapPin } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";

const normalize = (v: string) =>
  v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const TODAS = "todas";

export const TeamsDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [times, setTimes] = useState<Time[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeFiltro, setSedeFiltro] = useState<string>(TODAS);
  const [loading, setLoading] = useState(true);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;
    const onSelect = () => {
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };
    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  // Carrega sedes do evento e sugere a sede do usuário (cadastro ou localização)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listaSedes = await listarSedesPorEvento(EVENTO_ATUAL);
        if (cancelled) return;
        setSedes(listaSedes);

        let sedeSugerida: number | null = null;
        if (user?.email) {
          try {
            const lista = await listarUsuarios();
            setUsuarios(lista);
            sedeSugerida = lista.find((u) => u.email === user.email)?.sede ?? null;
          } catch {
            /* ignore */
          }
        }
        if (!sedeSugerida) {
          const loc = getSavedLocation();
          if (loc?.cidade) {
            sedeSugerida =
              listaSedes.find((s) => normalize(s.cidade) === normalize(loc.cidade))?.id ?? null;
          }
        }
        if (!cancelled && sedeSugerida) setSedeFiltro(String(sedeSugerida));
      } catch (error) {
        console.error("Erro ao carregar sedes:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  useEffect(() => {
    if (usuarios.length > 0) return;
    let cancelled = false;
    listarUsuarios()
      .then((lista) => !cancelled && setUsuarios(lista))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [usuarios.length]);

  useEffect(() => {
    let active = true;
    const fetchTimes = async () => {
      try {
        // Uma única requisição já traz os times COM os integrantes.
        const timesData = await listarTimesComIntegrantes({
          evento: EVENTO_ATUAL,
          sede_id: sedeFiltro === TODAS ? null : Number(sedeFiltro),
        });
        if (!active) return;
        setTimes(timesData);
      } catch (error) {
        console.error("Erro ao carregar times:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTimes();
    // Atualização periódica leve, e apenas com a aba visível.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchTimes();
    }, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sedeFiltro]);


  const sedeAtual = useMemo(
    () => sedes.find((s) => String(s.id) === sedeFiltro) ?? null,
    [sedes, sedeFiltro]
  );

  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <Users className="h-10 w-10 text-primary" />
        <h2 className="text-3xl md:text-4xl font-bold text-center">Times Cadastrados</h2>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <MapPin className="w-4 h-4" /> Sede
        </span>
        <Select value={sedeFiltro} onValueChange={setSedeFiltro}>
          <SelectTrigger className="w-full sm:w-[320px]">
            <SelectValue placeholder="Selecione a sede" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODAS}>Todas as sedes</SelectItem>
            {sedes.map((sede) => (
              <SelectItem key={sede.id} value={String(sede.id)}>
                {sede.nome_campus} — {sede.cidade}/{sede.uf}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sedeAtual && (
          <Badge variant="secondary">Mostrando os times de {sedeAtual.cidade}</Badge>
        )}
      </div>

      {loading ? (
        <div className="w-full py-12 text-center">
          <p className="text-muted-foreground">Carregando times...</p>
        </div>
      ) : times.length === 0 ? (
        <div className="w-full py-12 text-center">
          <p className="text-muted-foreground">
            Nenhum time cadastrado nesta sede ainda. Seja o primeiro!
          </p>
        </div>
      ) : (
        <Carousel
          setApi={setCarouselApi}
          plugins={[Autoplay({ delay: 3000, stopOnInteraction: true })]}
          opts={{ align: "start", loop: true }}
          className="w-full px-10 md:px-12"
        >
          <CarouselContent>
            {times.map((time) => (
              <CarouselItem key={time.id} className="md:basis-1/2 lg:basis-1/3">
                <div className="p-2">
                  <TeamCard
                    time={time}
                    usuarios={usuarios}
                    variant="column"
                    onClick={() => time.id != null && navigate(`/team-details/${time.id}`)}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {canScrollPrev && <CarouselPrevious className="left-0 md:-left-2" />}
          {canScrollNext && <CarouselNext className="right-0 md:-right-2" />}
        </Carousel>
      )}
    </div>
  );
};
