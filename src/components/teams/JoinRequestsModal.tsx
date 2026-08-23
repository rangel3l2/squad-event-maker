import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, X, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { adicionarIntegrante, listarUsuarios } from "@/services/api";
import { listarPedidosRecebidos, responderPedido, type JoinRequest } from "@/services/joinRequests";

/**
 * Modal global: sempre que o capitão logado tiver pedidos pendentes,
 * eles aparecem sobrepondo o site (um de cada vez, em fila).
 */
export function JoinRequestsModal() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<JoinRequest[]>([]);
  const [adiado, setAdiado] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [motivo, setMotivo] = useState("");

  const carregar = useCallback(async () => {
    if (!user?.email) {
      setPedidos([]);
      return;
    }
    try {
      const lista = await listarPedidosRecebidos(undefined, "pending");
      setPedidos(lista);
      if (lista.length > 0) setAdiado(false);
    } catch {
      setPedidos([]);
    }
  }, [user?.email]);

  useEffect(() => {
    void carregar();
    if (!user?.email) return;

    const channel = supabase
      .channel("join-requests-modal")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "join_requests" },
        () => {
          void carregar();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar, user?.email]);

  const pedido = pedidos[0];
  if (!pedido || adiado) return null;

  const aceitar = async () => {
    setProcessando(true);
    try {
      let usuarioId = pedido.requester_api_id;
      if (!usuarioId) {
        const usuarios = await listarUsuarios();
        usuarioId = usuarios.find((u) => u.email === pedido.requester_email)?.id ?? null;
      }
      if (!usuarioId) {
        toast.error("Este jogador ainda não completou o cadastro no evento");
        return;
      }

      // Ao aceitar, o jogador passa a fazer parte do time (herda o time/código)
      await adicionarIntegrante(pedido.team_id, {
        usuario_id: usuarioId,
        funcao: "Membro",
        evento: pedido.event_code,
      });
      await responderPedido(pedido.id, "accepted");

      toast.success(`${pedido.requester_name} agora faz parte do ${pedido.team_name}!`);
      setMotivo("");
      await carregar();
    } catch (error: any) {
      toast.error("Erro ao aceitar: " + (error.message || ""));
    } finally {
      setProcessando(false);
    }
  };

  const recusar = async () => {
    setProcessando(true);
    try {
      await responderPedido(pedido.id, "rejected", motivo.trim() || undefined);
      toast.success("Pedido recusado");
      setMotivo("");
      await carregar();
    } catch (error: any) {
      toast.error("Erro ao recusar: " + (error.message || ""));
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && setAdiado(true)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Nova solicitação para entrar no seu time
            {pedidos.length > 1 && <Badge variant="secondary">+{pedidos.length - 1}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Se você aceitar, o jogador entra direto no time <strong>{pedido.team_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={pedido.requester_avatar ?? undefined} alt="" />
            <AvatarFallback>{pedido.requester_name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{pedido.requester_name}</p>
            <p className="text-xs text-muted-foreground truncate">{pedido.requester_email}</p>
            <p className="text-sm mt-2 whitespace-pre-wrap">{pedido.message}</p>
          </div>
        </div>

        <Input
          placeholder="Motivo (opcional, se recusar)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={() => setAdiado(true)} disabled={processando}>
            Ver depois
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={recusar} disabled={processando}>
              <X className="w-4 h-4 mr-1" />
              Recusar
            </Button>
            <Button onClick={aceitar} disabled={processando}>
              <Check className="w-4 h-4 mr-1" />
              {processando ? "Processando..." : "Aceitar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
