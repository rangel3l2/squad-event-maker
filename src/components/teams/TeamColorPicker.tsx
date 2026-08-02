import { useEffect, useState } from "react";
import { Loader2, Palette, Check, Lock } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { disponibilidadeCores, EVENTO_ATUAL, type DisponibilidadeCor } from "@/services/api";

export interface CorSelecionada {
  cor_id: number;
  cor_base: string;
  cor_time: string;
}

interface TeamColorPickerProps {
  sedeId: number | null;
  evento?: number;
  value: CorSelecionada | null;
  onChange: (cor: CorSelecionada | null) => void;
  /** ids de cores que o próprio time já usa (não bloqueiam) */
  corAtualId?: number | null;
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Aplica variação de tom (-50 a +50) sobre a cor base */
export const aplicarTom = (hex: string, tom: number): string => {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const factor = tom / 100;
  const adjust = (c: number) => (factor >= 0 ? c + (255 - c) * factor : c + c * factor);
  return (
    "#" +
    [adjust(r), adjust(g), adjust(b)]
      .map((c) => clamp(c).toString(16).padStart(2, "0"))
      .join("")
  );
};

export function TeamColorPicker({
  sedeId,
  evento = EVENTO_ATUAL,
  value,
  onChange,
  corAtualId = null,
}: TeamColorPickerProps) {
  const [cores, setCores] = useState<DisponibilidadeCor[]>([]);
  const [limite, setLimite] = useState(3);
  const [loading, setLoading] = useState(false);
  const [tom, setTom] = useState(0);

  useEffect(() => {
    if (!sedeId) {
      setCores([]);
      return;
    }
    const load = async () => {
      setLoading(true);
      try {
        const data = await disponibilidadeCores(sedeId, evento);
        setCores(data.cores ?? []);
        setLimite(data.limite_por_cor ?? 3);
      } catch (error: any) {
        console.error("Erro ao carregar disponibilidade de cores:", error);
        toast.error(error.message || "Erro ao carregar cores disponíveis");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sedeId, evento]);

  const selecionarCor = (cor: DisponibilidadeCor) => {
    setTom(0);
    onChange({ cor_id: cor.cor_id, cor_base: cor.cor_base, cor_time: cor.cor_base });
  };

  const alterarTom = (novoTom: number) => {
    setTom(novoTom);
    if (value) {
      onChange({ ...value, cor_time: aplicarTom(value.cor_base, novoTom) });
    }
  };

  if (!sedeId) {
    return (
      <p className="text-sm text-muted-foreground">
        Escolha a sede para ver as cores disponíveis.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Cor do Time
        </Label>
        <Badge variant="outline">Máx. {limite} times por cor nesta sede</Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando cores...
        </div>
      ) : cores.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cor cadastrada.</p>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 gap-3">
          {cores.map((cor) => {
            const isSelected = value?.cor_id === cor.cor_id;
            const bloqueada = !cor.disponivel && cor.cor_id !== corAtualId && !isSelected;
            return (
              <button
                key={cor.cor_id}
                type="button"
                disabled={bloqueada}
                onClick={() => selecionarCor(cor)}
                title={
                  bloqueada
                    ? `Sem vagas — usada por: ${cor.times.map((t) => t.nome_time).join(", ")}`
                    : `${cor.vagas} vaga(s) — ${cor.usos}/${limite}`
                }
                className={cn(
                  "relative aspect-square rounded-lg border-2 transition-all",
                  isSelected ? "border-foreground scale-110" : "border-border",
                  bloqueada ? "opacity-30 cursor-not-allowed" : "hover:scale-105"
                )}
                style={{ backgroundColor: isSelected ? value!.cor_time : cor.cor_base }}
              >
                {isSelected && (
                  <Check className="absolute inset-0 m-auto w-5 h-5 text-background drop-shadow" />
                )}
                {bloqueada && <Lock className="absolute inset-0 m-auto w-4 h-4 text-foreground" />}
                <span className="absolute -bottom-4 left-0 right-0 text-[10px] text-muted-foreground">
                  {cor.vagas}/{limite}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {value && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-md border"
              style={{ backgroundColor: value.cor_time }}
            />
            <div className="text-sm">
              <p className="font-medium">{value.cor_time.toUpperCase()}</p>
              <p className="text-muted-foreground">Base: {value.cor_base.toUpperCase()}</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Variação de tom</Label>
            <Slider
              value={[tom]}
              min={-50}
              max={50}
              step={5}
              onValueChange={(v) => alterarTom(v[0])}
            />
            <p className="text-xs text-muted-foreground">
              Ajuste o tom mantendo a mesma cor base do limite por sede.
            </p>
          </div>
        </div>
      )}

      {value &&
        (() => {
          const cor = cores.find((c) => c.cor_id === value.cor_id);
          if (!cor || cor.times.length === 0) return null;
          return (
            <p className="text-xs text-muted-foreground">
              Times que já usam esta cor: {cor.times.map((t) => t.nome_time).join(", ")}
            </p>
          );
        })()}
    </div>
  );
}
