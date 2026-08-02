import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Loader2, Trash2 } from "lucide-react";
import { TeamColorPicker, type CorSelecionada } from "./TeamColorPicker";
import { definirCorTime, removerCorTime, EVENTO_ATUAL } from "@/services/api";

interface TeamColorManagerProps {
  timeId: number;
  donoId: number;
  sedeId: number | null;
  evento?: number;
  corAtualId?: number | null;
  corAtual?: string | null;
  onUpdated?: () => void;
}

export function TeamColorManager({
  timeId,
  donoId,
  sedeId,
  evento = EVENTO_ATUAL,
  corAtualId = null,
  corAtual = null,
  onUpdated,
}: TeamColorManagerProps) {
  const [cor, setCor] = useState<CorSelecionada | null>(null);
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    if (!cor) {
      toast.error("Escolha uma cor");
      return;
    }
    setSaving(true);
    try {
      await definirCorTime(timeId, { dono_id: donoId, cor_id: cor.cor_id, cor_time: cor.cor_time });
      toast.success("Cor do time atualizada!");
      onUpdated?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar cor");
    } finally {
      setSaving(false);
    }
  };

  const remover = async () => {
    setSaving(true);
    try {
      await removerCorTime(timeId, donoId);
      setCor(null);
      toast.success("Cor removida");
      onUpdated?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao remover cor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Cor do Time
        </CardTitle>
        <CardDescription>
          Máximo de 3 times por cor na mesma sede e evento.
          {corAtual && (
            <span className="ml-2 inline-flex items-center gap-2">
              Atual:
              <span
                className="inline-block w-4 h-4 rounded border align-middle"
                style={{ backgroundColor: corAtual }}
              />
              {corAtual.toUpperCase()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TeamColorPicker
          sedeId={sedeId}
          evento={evento}
          value={cor}
          onChange={setCor}
          corAtualId={corAtualId}
        />
        <div className="flex gap-2">
          <Button onClick={salvar} disabled={saving || !cor}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar cor
          </Button>
          {corAtualId && (
            <Button variant="outline" onClick={remover} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remover cor
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
