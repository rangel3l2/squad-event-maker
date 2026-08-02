import { useEffect, useState } from "react";
import { MapPin, Loader2, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listarSedesPorEvento, EVENTO_ATUAL, type Sede } from "@/services/api";

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

  const detectarLocalizacao = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Seu navegador não suporta geolocalização. Selecione a sede manualmente.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const resp = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
          );
          if (!resp.ok) throw new Error("Falha ao identificar a cidade");
          const data = await resp.json();

          const cidade: string = data.city || data.locality || data.principalSubdivision || "";
          const uf: string = data.principalSubdivisionCode?.split("-")?.[1] || "";
          setLocalizacao([cidade, uf].filter(Boolean).join(" - "));

          const match =
            sedes.find(
              (s) => normalize(s.cidade) === normalize(cidade) && normalize(s.uf) === normalize(uf)
            ) ||
            sedes.find((s) => normalize(s.cidade) === normalize(cidade)) ||
            sedes.find((s) => normalize(s.uf) === normalize(uf));

          if (match) {
            onChange(match.id);
            toast.success(`Sede sugerida: ${match.nome_campus}`);
          } else {
            toast.info("Nenhuma sede encontrada perto de você. Escolha manualmente.");
          }
        } catch (error) {
          console.error("Erro na geolocalização:", error);
          toast.error("Não conseguimos identificar sua cidade. Escolha a sede manualmente.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.warn("Permissão de localização negada:", error);
        setLocating(false);
        toast.info("Sem acesso à localização. Selecione a sede manualmente.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
