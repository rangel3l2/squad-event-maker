import { useEffect, useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarSedesPorEvento, EVENTO_ATUAL, type Sede } from "@/services/api";
import { getSavedLocation, requestUserLocation } from "@/hooks/useUserLocation";

interface SedeSelectorProps {
  value: number | null;
  onChange: (sedeId: number | null) => void;
  evento?: number;
}

const normalize = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function SedeSelector({ value, onChange, evento = EVENTO_ATUAL }: SedeSelectorProps) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [localizacao, setLocalizacao] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listarSedesPorEvento(evento);
        setSedes(data);
      } catch (error: any) {
        console.error("Erro ao carregar sedes:", error);
        toast.error("Não foi possível carregar as sedes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [evento]);

  const aplicarLocalizacao = (cidade: string, uf: string, listaSedes: Sede[], silent = false) => {
    setLocalizacao([cidade, uf].filter(Boolean).join(" - "));
    const match =
      listaSedes.find(
        (s) => normalize(s.cidade) === normalize(cidade) && normalize(s.uf) === normalize(uf)
      ) ||
      listaSedes.find((s) => normalize(s.cidade) === normalize(cidade)) ||
      listaSedes.find((s) => normalize(s.uf) === normalize(uf));

    if (match) {
      onChange(match.id);
      if (!silent) toast.success(`Sede sugerida: ${match.nome_campus}`);
    } else if (!silent) {
      toast.info("Nenhuma sede encontrada perto de você. Escolha manualmente.");
    }
  };

  // Reaproveita a localização já autorizada no login
  useEffect(() => {
    if (loading || value) return;
    const saved = getSavedLocation();
    if (saved) aplicarLocalizacao(saved.cidade, saved.uf, sedes, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, sedes]);

  const detectarLocalizacao = async () => {
    setLocating(true);
    const loc = await requestUserLocation();
    setLocating(false);
    if (!loc) {
      toast.info("Sem acesso à localização. Selecione a sede manualmente.");
      return;
    }
    aplicarLocalizacao(loc.cidade, loc.uf, sedes);
  };

  const sedeSelecionada = sedes.find((s) => s.id === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Sede *</Label>
        <Button type="button" variant="outline" size="sm" onClick={detectarLocalizacao} disabled={locating || loading}>
          {locating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LocateFixed className="w-4 h-4 mr-2" />}
          Usar minha localização
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Podemos usar sua localização (com sua permissão) apenas para sugerir a sede mais próxima. Você pode
        escolher manualmente a qualquer momento.
      </p>

      {localizacao && (
        <Badge variant="secondary" className="gap-1">
          <MapPin className="w-3 h-3" />
          {localizacao}
        </Badge>
      )}

      <Select
        value={value ? String(value) : undefined}
        onValueChange={(v) => onChange(Number(v))}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Carregando sedes..." : "Selecione a sede"} />
        </SelectTrigger>
        <SelectContent>
          {sedes.map((sede) => (
            <SelectItem key={sede.id} value={String(sede.id)}>
              {sede.nome_campus} — {sede.cidade}/{sede.uf}
            </SelectItem>
          ))}
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
