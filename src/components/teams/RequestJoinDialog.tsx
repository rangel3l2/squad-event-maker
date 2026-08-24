import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios, type Time, EVENTO_ATUAL } from "@/services/api";
import {
  criarPedidoEntrada,
  listarMeusPedidos,
  cancelarPedido,
  type JoinRequest,
} from "@/services/joinRequests";
import { registrarConvite, cancelarConviteDoUsuario } from "@/services/convites";

interface RequestJoinDialogProps {
  time: Time;
  /** e-mail do dono/capitão do time */
  captainEmail?: string | null;
  captainApiId?: number | null;
}

export function RequestJoinDialog({ time, captainEmail, captainApiId }: RequestJoinDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [pedido, setPedido] = useState<JoinRequest | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregarPedido = async () => {
    if (!user || time.id == null) {
      setCarregando(false);
      return;
    }
    try {
      const pedidos = await listarMeusPedidos(time.id);
      setPedido(pedidos[0] ?? null);
    } catch {
      setPedido(null);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    void carregarPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, time.id]);

  const enviar = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }
    if (!captainEmail) {
      toast.error("Não foi possível identificar o capitão deste time");
      return;
    }
    if (mensagem.trim().length < 3) {
      toast.error("Escreva uma mensagem para o capitão");
      return;
    }

    setEnviando(true);
    try {
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find((u) => u.email === user.email);

      const novo = await criarPedidoEntrada({
        team_id: time.id!,
        team_name: time.nome_time,
        event_code: time.evento ?? EVENTO_ATUAL,
        requester_api_id: usuario?.id ?? null,
        requester_name: usuario?.nome ?? user.user_metadata?.full_name ?? user.email!,
        requester_email: user.email!,
        requester_avatar: usuario?.url_image_perfil ?? null,
        captain_api_id: captainApiId ?? null,
        captain_email: captainEmail,
        message: mensagem.trim(),
      });

      // Registra a solicitação também na API oficial (convite_entrar_time)
      if (usuario?.id != null) {
        try {
          await registrarConvite(usuario.id, time.id!);
        } catch (e) {
          console.warn("Não foi possível registrar o convite na API:", e);
        }
      }

      setPedido(novo);
      setMensagem("");
      setOpen(false);
      toast.success("Pedido enviado! Aguarde a resposta do capitão.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar pedido");
    } finally {
      setEnviando(false);
    }
  };

  const cancelar = async () => {
    if (!pedido) return;
    try {
      await cancelarPedido(pedido.id);
      if (pedido.requester_api_id != null && time.id != null) {
        try {
          await cancelarConviteDoUsuario(time.id, pedido.requester_api_id);
        } catch (e) {
          console.warn("Não foi possível cancelar o convite na API:", e);
        }
      }
      setPedido({ ...pedido, status: "cancelled" });
      toast.success("Pedido cancelado");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar pedido");
    }
  };

  if (carregando) return null;

  if (pedido?.status === "pending") {
    return (
      <div className="w-full max-w-md rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4 text-primary" />
          Pedido enviado — aguardando resposta do capitão
        </div>
        <p className="text-xs text-muted-foreground italic">"{pedido.message}"</p>
        <Button variant="ghost" size="sm" onClick={cancelar}>
          <XCircle className="w-4 h-4 mr-2" />
          Cancelar pedido
        </Button>
      </div>
    );
  }

  // Só é permitido um pedido por time: depois de respondido, não pode pedir de novo.
  if (pedido?.status === "rejected") {
    return (
      <div className="w-full max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
        <Badge variant="destructive">Pedido recusado pelo capitão</Badge>
        {pedido.response_message && (
          <p className="text-xs text-muted-foreground">Resposta: {pedido.response_message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Você só pode solicitar entrada neste time uma vez.
        </p>
      </div>
    );
  }

  if (pedido?.status === "accepted") return null;

  return (
    <div className="w-full max-w-md space-y-2">


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <MessageSquarePlus className="w-4 h-4 mr-2" />
            Entrar no time
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pedir para entrar em "{time.nome_time}"</DialogTitle>
            <DialogDescription>
              Escreva uma mensagem para o capitão. Ele poderá aceitar ou recusar seu pedido.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Oi! Sou do 3º ano, jogo de meio-campo e queria muito entrar no time..."
            value={mensagem}
            maxLength={1000}
            rows={5}
            onChange={(e) => setMensagem(e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-right">{mensagem.length}/1000</p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={enviando || mensagem.trim().length < 3}>
              {enviando ? "Enviando..." : "Enviar pedido"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
