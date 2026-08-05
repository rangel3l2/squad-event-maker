import { useEffect, useMemo, useState } from "react";
import { MapPin, Loader2, Navigation, Trophy, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listarSedesPorEvento, EVENTO_ATUAL, type Sede } from "@/services/api";
import { useUserLocation } from "@/hooks/useUserLocation";

const normalize = (v: string) =>
  (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const SedesShowcase = () => {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const { location, loading: locating, denied, request } = useUserLocation(true);

  useEffect(() => {
    listarSedesPorEvento(EVENTO_ATUAL)
      .then(setSedes)
      .catch(() => setSedes([]))
      .finally(() => setLoading(false));
  }, []);

  const sedeProxima = useMemo(() => {
    if (!location) return null;
    return (
      sedes.find(
        (s) => normalize(s.cidade) === normalize(location.cidade) && normalize(s.uf) === normalize(location.uf)
      ) ||
      sedes.find((s) => normalize(s.cidade) === normalize(location.cidade)) ||
      sedes.find((s) => normalize(s.uf) === normalize(location.uf)) ||
      null
    );
  }, [sedes, location]);

  const outrasSedes = sedes.filter((s) => s.id !== sedeProxima?.id);

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Copa 2026</p>
          <h3 className="text-xl md:text-2xl font-bold">Um evento nacional</h3>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando sedes..." : `${sedes.length} campi inscritos em todo o Brasil`}
          </p>
        </div>

        {location ? (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="w-3 h-3" />
            {[location.cidade, location.uf].filter(Boolean).join(" - ") || "Localização detectada"}
          </Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => request()} disabled={locating}>
            {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Navigation className="w-4 h-4 mr-2" />}
            Permitir localização
          </Button>
        )}
      </div>

      {denied && !location && (
        <p className="mt-3 text-xs text-muted-foreground">
          A localização é obrigatória para inscrever seu time — libere a permissão no navegador.
        </p>
      )}

      {sedeProxima && (
        <div className="mt-5 rounded-xl border border-primary/40 bg-card/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide">
            <Trophy className="w-4 h-4" />
            Sede mais próxima de você
          </div>
          <p className="mt-1 text-lg font-bold">{sedeProxima.nome_campus}</p>
          <p className="text-sm text-muted-foreground">
            {sedeProxima.cidade}/{sedeProxima.uf}
            {sedeProxima.instituicao ? ` · ${sedeProxima.instituicao}` : ""}
          </p>
        </div>
      )}

      {outrasSedes.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outras sedes pelo Brasil
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {outrasSedes.map((sede) => (
              <div
                key={sede.id}
                className="rounded-lg border border-border/60 bg-card/60 p-3 transition-colors hover:border-primary/50"
              >
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sede.nome_campus}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sede.cidade}/{sede.uf}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
