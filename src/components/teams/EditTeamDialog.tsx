import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { TeamLogoUploader } from "./TeamLogoUploader";
import { SedeSelector } from "./SedeSelector";
import { TeamColorPicker, type CorSelecionada } from "./TeamColorPicker";
import { atualizarTime, definirCorTime, listarTimes, EVENTO_ATUAL, type Time } from "@/services/api";

interface EditTeamDialogProps {
  time: Time;
  onUpdated: (time: Time) => void;
}

export function EditTeamDialog({ time, onUpdated }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(time.nome_time ?? "");
  const [logoUrl, setLogoUrl] = useState(time.imagem_time ?? "");
  const [miniLogoUrl, setMiniLogoUrl] = useState(time.img_logo_pequeno ?? "");
  const [sedeId, setSedeId] = useState<number | null>(time.sede ?? null);
  const [cor, setCor] = useState<CorSelecionada | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(time.nome_time ?? "");
    setLogoUrl(time.imagem_time ?? "");
    setMiniLogoUrl(time.img_logo_pequeno ?? "");
    setSedeId(time.sede ?? null);
    // Inicializa a cor apenas se o time já tiver uma cor definida
    if (time.cor_id && time.cor_time) {
      setCor({
        cor_id: time.cor_id,
        cor_base: time.cor_base ?? time.cor_time,
        cor_time: time.cor_time,
      });
    } else {
      setCor(null);
    }
  }, [open, time]);

  const evento = time.evento ?? EVENTO_ATUAL;

  const handleSave = async () => {
    const nomeLimpo = nome.trim();

    if (nomeLimpo.length < 3 || nomeLimpo.length > 50) {
      toast.error("O nome do time deve ter entre 3 e 50 caracteres");
      return;
    }
    if (!logoUrl) {
      toast.error("O logo do time é obrigatório");
      return;
    }
    if (!miniLogoUrl) {
      toast.error("A miniatura do logo (mini logo) é obrigatória");
      return;
    }
    if (!sedeId) {
      toast.error("Selecione o campus/sede do time");
      return;
    }

    setSaving(true);
    try {
      // Nome duplicado na mesma edição (ignorando o próprio time)
      if (nomeLimpo.toLowerCase() !== (time.nome_time ?? "").toLowerCase().trim()) {
        const times = await listarTimes({ evento });
        const duplicado = times.find(
          (t) =>
            Number(t.id) !== Number(time.id) &&
            (t.nome_time || "").toLowerCase().trim() === nomeLimpo.toLowerCase()
        );
        if (duplicado) {
          toast.error("Esse nome já foi usado por outro time", {
            description: `Já existe o time "${duplicado.nome_time}" nesta edição. Escolha outro nome.`,
          });
          setSaving(false);
          return;
        }
      }

      await atualizarTime(time.id!, {
        nome_time: nomeLimpo,
        imagem_time: logoUrl,
        img_logo_pequeno: miniLogoUrl,
        sede: sedeId,
        evento,
      });

      // Se a cor foi alterada, salva via rota dedicada de cor
      if (cor && (cor.cor_id !== time.cor_id || cor.cor_time !== time.cor_time)) {
        await definirCorTime(time.id!, {
          dono_id: time.dono_id!,
          cor_id: cor.cor_id,
          cor_time: cor.cor_time,
        });
      }

      toast.success("Dados do time atualizados!");
      setOpen(false);
      onUpdated({
        ...time,
        nome_time: nomeLimpo,
        imagem_time: logoUrl,
        img_logo_pequeno: miniLogoUrl,
        sede: sedeId,
        cor_id: cor?.cor_id ?? time.cor_id,
        cor_base: cor?.cor_base ?? time.cor_base,
        cor_time: cor?.cor_time ?? time.cor_time,
      });
    } catch (error: any) {
      const msg = String(error?.message ?? "");
      if (/duplicate|unique|já existe|nome_time/i.test(msg)) {
        toast.error("Esse nome já foi usado por outro time nesta edição");
      } else {
        toast.error("Erro ao atualizar o time: " + msg);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="w-4 h-4 mr-2" />
          Editar Time
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar dados do time</DialogTitle>
          <DialogDescription>
            Você é o líder deste time e pode alterar todos os dados. O código de convite continua o
            mesmo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-left">
          <div className="space-y-2">
            <Label htmlFor="edit-nome-time">Nome do Time *</Label>
            <Input
              id="edit-nome-time"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={50}
              placeholder="Digite o nome do time"
            />
          </div>

          <TeamLogoUploader currentLogo={logoUrl} onLogoChange={setLogoUrl} maxSizeKB={400} />

          <TeamLogoUploader
            currentLogo={miniLogoUrl}
            onLogoChange={setMiniLogoUrl}
            label="Miniatura do Logo (mini logo) *"
            description="Versão reduzida do logo, usada em listagens (máx. 50KB)."
            maxSizeKB={50}
          />

          <SedeSelector value={sedeId} onChange={setSedeId} evento={evento} />

          <div className="space-y-3">
            <TeamColorPicker
              sedeId={sedeId}
              evento={evento}
              value={cor}
              onChange={setCor}
              corAtualId={time.cor_id ?? null}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-codigo-time">Código de convite (não editável)</Label>
            <Input
              id="edit-codigo-time"
              value={time.senha_convite ?? ""}
              readOnly
              disabled
              className="font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
