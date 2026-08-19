import { useEffect, useState } from "react";
import { MapPin, Loader2, LocateFixed, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENTO_ATUAL } from "@/services/api";
import { useSedesOrdenadas, RAIO_PROXIMO_KM } from "@/hooks/useSedesOrdenadas";
import { cityKey } from "@/lib/geo";

interface SedeSelectorProps {
  value: number | null;
  onChange: (sedeId: number | null) => void;
  evento?: number;
}

const formatDistancia = (km: number | null) =>
  km === null ? "" : km < 1 ? " · menos de 1 km" : ` · ${Math.round(km)} km`;

export function SedeSelector({ value, onChange, evento = EVENTO_ATUAL }: SedeSelectorProps) {
  const {
    sedes,
    cidades,
    sedeSugerida,
    loading,
    location,
    locating,
    request,
    selectCity,
    resetCity,
    isManual,
  } = useSedesOrdenadas(evento);
  const [autofilled, setAutofilled] = useState(false);

  // Sugere automaticamente a sede mais próxima, mas o usuário pode trocar
  useEffect(() => {
    if (loading || value || autofilled || !sedeSugerida) return;
    onChange(sedeSugerida.id);
    setAutofilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sedeSugerida, value, autofilled]);

  const detectarLocalizacao = async () => {
    const loc = await request();
    if (!loc) toast.info("Sem acesso à localização. Selecione a cidade e a sede manualmente.");
  };

  const cidadeAtual = location ? cityKey(location.cidade, location.uf) : "";
  const sedeSelecionada = sedes.find((s) => s.id === value);
  const proximas = sedes.filter((s) => s.perto);
  const demais = sedes.filter((s) => !s.perto);

  // Escolher uma sede também define a cidade de referência para todo o site
  const handleSelectSede = (id: number) => {
    onChange(id);
    const sede = sedes.find((s) => s.id === id);
    if (sede && cityKey(sede.cidade, sede.uf) !== cidadeAtual) {
      void selectCity(sede.cidade, sede.uf);
    }
  };


  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Sede *</Label>
        <div className="flex items-center gap-2">
          {isManual && (
            <Button type="button" variant="ghost" size="sm" onClick={resetCity} title="Voltar para minha localização">
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={detectarLocalizacao} disabled={locating || loading}>
            {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-2" />}
            Usar minha localização
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Usamos sua localização apenas para <strong>sugerir</strong> a sede mais próxima. Você pode trocar a
        cidade de referência ou escolher outra sede a qualquer momento — a escolha vale para todo o site.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {location && (
          <Badge variant="secondary" className="gap-1">
            <MapPin className="w-3 h-3" />
            {[location.cidade, location.uf].filter(Boolean).join(" - ")}
            {isManual ? " (escolhida)" : ""}
          </Badge>
        )}
        <Select
          value={cidades.some((c) => cityKey(c.cidade, c.uf) === cidadeAtual) ? cidadeAtual : undefined}
          onValueChange={(k) => {
            const c = cidades.find((x) => cityKey(x.cidade, x.uf) === k);
            if (c) void selectCity(c.cidade, c.uf);
          }}
        >
          <SelectTrigger className="h-8 w-[240px] text-xs">
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
      </div>

      <Select
        value={value ? String(value) : undefined}
        onValueChange={(v) => handleSelectSede(Number(v))}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando sedes..." : "Selecione a sede"} />
        </SelectTrigger>
        <SelectContent>
          {proximas.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Perto de você (até {RAIO_PROXIMO_KM} km)
              </div>
              {proximas.map((sede) => (
                <SelectItem key={sede.id} value={String(sede.id)}>
                  {sede.nome_campus} — {sede.cidade}/{sede.uf}
                  {formatDistancia(sede.distanciaKm)}
                </SelectItem>
              ))}
            </>
          )}
          {demais.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Outras sedes (A-Z)
              </div>
              {demais.map((sede) => (
                <SelectItem key={sede.id} value={String(sede.id)}>
                  {sede.nome_campus} — {sede.cidade}/{sede.uf}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {sedeSelecionada && (
        <p className="text-sm text-muted-foreground">
          Sede escolhida: <strong>{sedeSelecionada.nome_campus}</strong> ({sedeSelecionada.cidade}/
          {sedeSelecionada.uf})
        </p>
      )}
    </div>
  );
}
