import { useCallback, useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adicionarIntegrante, listarUsuarios } from "@/services/api";
import { listarPedidosRecebidos, responderPedido, type JoinRequest } from "@/services/joinRequests";
import { sincronizarDecisao } from "@/services/convites";

/** Hook compartilhado: pedidos pendentes recebidos pelo capitão logado. */
export function usePedidosRecebidos() {
  const [pedidos, setPedidos] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      setPedidos(await listarPedidosRecebidos(undefined, "pending"));
    } catch {
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const channel = supabase
      .channel(`join-requests-list-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "join_requests" }, () => {
        void carregar();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [carregar]);

  return { pedidos, loading, recarregar: carregar };
}

interface Props {
  pedidos: JoinRequest[];
  onChanged?: () => void;
  compact?: boolean;
}

/** Lista de solicitações recebidas com Aceitar / Recusar. */
export function JoinRequestsList({ pedidos, onChanged, compact }: Props) {
  const [processando, setProcessando] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const aceitar = async (pedido: JoinRequest) => {
    setProcessando(pedido.id);
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
      await adicionarIntegrante(pedido.team_id, {
        usuario_id: usuarioId,
        funcao: "Membro",
        evento: pedido.event_code,
      });
      await responderPedido(pedido.id, "accepted");
      try {
        await sincronizarDecisao(pedido.team_id, usuarioId, true);
      } catch (e) {
        console.warn("Não foi possível atualizar o convite na API:", e);
      }
      toast.success(`${pedido.requester_name} agora faz parte do ${pedido.team_name}!`);
      onChanged?.();
    } catch (error: any) {
      toast.error("Erro ao aceitar: " + (error.message || ""));
    } finally {
      setProcessando(null);
    }
  };

  const recusar = async (pedido: JoinRequest) => {
    setProcessando(pedido.id);
    try {
      await responderPedido(pedido.id, "rejected", motivos[pedido.id]?.trim() || undefined);
      if (pedido.requester_api_id != null) {
        try {
          await sincronizarDecisao(pedido.team_id, pedido.requester_api_id, false);
        } catch (e) {
          console.warn("Não foi possível atualizar o convite na API:", e);
        }
      }
      toast.success("Pedido recusado");
      onChanged?.();
    } catch (error: any) {
      toast.error("Erro ao recusar: " + (error.message || ""));
    } finally {
      setProcessando(null);
    }
  };

  const mensagemMockada = (nome: string) => `${nome} deseja entrar no seu time.`;

  return (
    <div className="space-y-3">
      {pedidos.map((pedido) => (
        <div key={pedido.id} className="rounded-lg border border-border/60 p-3 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className={compact ? "w-8 h-8" : "w-10 h-10"}>
              <AvatarImage src={pedido.requester_avatar ?? undefined} alt="" />
              <AvatarFallback>{pedido.requester_name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate text-sm">{pedido.requester_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                quer entrar no {pedido.team_name}
              </p>
              <p className="text-sm mt-2 whitespace-pre-wrap">{mensagemMockada(pedido.requester_name)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Motivo (opcional, se recusar)"
              value={motivos[pedido.id] ?? ""}
              onChange={(e) => setMotivos((m) => ({ ...m, [pedido.id]: e.target.value }))}
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => aceitar(pedido)} disabled={processando === pedido.id}>
                <Check className="w-4 h-4 mr-1" />
                Aceitar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => recusar(pedido)}
                disabled={processando === pedido.id}
              >
                <X className="w-4 h-4 mr-1" />
                Recusar
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
