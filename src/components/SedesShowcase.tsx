import { MapPin, Loader2, Navigation, Trophy, Building2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSedesOrdenadas, RAIO_PROXIMO_KM } from "@/hooks/useSedesOrdenadas";
import { cityKey } from "@/lib/geo";

const formatDistancia = (km: number | null) =>
  km === null ? null : km < 1 ? "menos de 1 km" : `${Math.round(km)} km`;

export const SedesShowcase = () => {
  const {
    sedes,
    cidades,
    sedeSugerida,
    loading,
    location,
    locating,
    request,
    denied,
    selectCity,
    resetCity,
    isManual,
  } = useSedesOrdenadas();

  const outrasSedes = sedes.filter((s) => s.id !== sedeSugerida?.id);
  const proximas = outrasSedes.filter((s) => s.perto);
  const demais = outrasSedes.filter((s) => !s.perto);
  const cidadeAtual = location ? cityKey(location.cidade, location.uf) : "";

  return (
    <div className="relative h-full w-full overflow-y-auto bg-gradient-to-br from-primary/15 via-background to-accent/10 p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Copa 2026</p>
          <h3 className="text-xl md:text-2xl font-bold">Um evento nacional</h3>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando sedes..." : `${sedes.length} campi inscritos em todo o Brasil`}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {location && (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="w-3 h-3" />
                {[location.cidade, location.uf].filter(Boolean).join(" - ") || "Localização detectada"}
                {isManual ? " (escolhida)" : ""}
              </Badge>
            )}
            {!location && (
              <Button size="sm" variant="outline" onClick={() => request()} disabled={locating}>
                {locating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4 mr-2" />
                )}
                Permitir localização
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={cidades.some((c) => cityKey(c.cidade, c.uf) === cidadeAtual) ? cidadeAtual : undefined}
              onValueChange={(k) => {
                const c = cidades.find((x) => cityKey(x.cidade, x.uf) === k);
                if (c) void selectCity(c.cidade, c.uf);
              }}
            >
              <SelectTrigger className="h-8 w-[220px] bg-card/70 text-xs backdrop-blur">
                <SelectValue placeholder="Trocar cidade de referência" />
              </SelectTrigger>
              <SelectContent>
                {cidades.map((c) => (
                  <SelectItem key={cityKey(c.cidade, c.uf)} value={cityKey(c.cidade, c.uf)}>
                    {c.cidade}/{c.uf} · {c.total} {c.total > 1 ? "sedes" : "sede"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isManual && (
              <Button size="sm" variant="ghost" className="h-8 px-2" onClick={resetCity} title="Voltar para minha localização">
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {denied && !location && (
        <p className="mt-3 text-xs text-muted-foreground">
          A localização é obrigatória para inscrever seu time — libere a permissão no navegador ou escolha
          sua cidade na lista acima.
        </p>
      )}

      {sedeSugerida && (
        <div className="mt-5 rounded-xl border border-primary/40 bg-card/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wide">
            <Trophy className="w-4 h-4" />
            Sugestão de sede mais próxima
          </div>
          <p className="mt-1 text-lg font-bold">{sedeSugerida.nome_campus}</p>
          <p className="text-sm text-muted-foreground">
            {sedeSugerida.cidade}/{sedeSugerida.uf}
            {sedeSugerida.instituicao ? ` · ${sedeSugerida.instituicao}` : ""}
            {sedeSugerida.distanciaKm !== null ? ` · ${formatDistancia(sedeSugerida.distanciaKm)}` : ""}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            É apenas uma sugestão: você pode trocar a cidade de referência acima e a mudança vale para todo o
            site.
          </p>
        </div>
      )}

      {proximas.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perto de você (até {RAIO_PROXIMO_KM} km)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {proximas.map((sede) => (
              <div
                key={sede.id}
                className="rounded-lg border border-primary/30 bg-card/70 p-3 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start gap-2">
                  <Building2 className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{sede.nome_campus}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sede.cidade}/{sede.uf}
                      {sede.distanciaKm !== null ? ` · ${formatDistancia(sede.distanciaKm)}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {demais.length > 0 && (
        <>
          <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outras sedes pelo Brasil (ordem alfabética)
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {demais.map((sede) => (
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
                      {sede.distanciaKm !== null ? ` · ${formatDistancia(sede.distanciaKm)}` : ""}
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
