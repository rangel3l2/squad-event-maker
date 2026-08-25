import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Inbox, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adicionarIntegrante, listarUsuarios, EVENTO_ATUAL, type Time } from "@/services/api";
import { listarPedidosRecebidos, responderPedido, type JoinRequest } from "@/services/joinRequests";

interface JoinRequestsPanelProps {
  time: Time;
  onAccepted?: () => void;
}

export function JoinRequestsPanel({ time, onAccepted }: JoinRequestsPanelProps) {
  const [pedidos, setPedidos] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    if (time.id == null) return;
    try {
      const lista = await listarPedidosRecebidos(time.id, "pending");
      setPedidos(lista);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  }, [time.id]);

  useEffect(() => {
    void carregar();

    const channel = supabase
      .channel(`join-requests-team-${time.id}`)
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
  }, [carregar, time.id]);

  const aceitar = async (pedido: JoinRequest) => {
    setProcessando(pedido.id);
    try {
      const totalMembros = time.qtd_integrantes ?? time.integrantes?.length ?? 0;
      if (totalMembros >= 4) {
        toast.error("O time já atingiu o limite de 4 membros");
        return;
      }

      let usuarioId = pedido.requester_api_id;
      if (!usuarioId) {
        const usuarios = await listarUsuarios();
        usuarioId = usuarios.find((u) => u.email === pedido.requester_email)?.id ?? null;
      }
      if (!usuarioId) {
        toast.error("Este jogador ainda não completou o cadastro no evento");
        return;
      }

      await adicionarIntegrante(time.id!, {
        usuario_id: usuarioId,
        funcao: "Membro",
        evento: time.evento ?? EVENTO_ATUAL,
      });

      await responderPedido(pedido.id, "accepted");
      toast.success(`${pedido.requester_name} entrou no time!`);
      await carregar();
      onAccepted?.();
    } catch (error: any) {
      toast.error("Erro ao aceitar pedido: " + (error.message || ""));
    } finally {
      setProcessando(null);
    }
  };

  const recusar = async (pedido: JoinRequest) => {
    setProcessando(pedido.id);
    try {
      await responderPedido(pedido.id, "rejected", motivos[pedido.id]?.trim() || undefined);
      toast.success("Pedido recusado");
      await carregar();
    } catch (error: any) {
      toast.error("Erro ao recusar pedido: " + (error.message || ""));
    } finally {
      setProcessando(null);
    }
  };

  if (loading || pedidos.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5 text-primary" />
          Pedidos para entrar
          <Badge variant="secondary">{pedidos.length}</Badge>
        </CardTitle>
        <CardDescription>Aceite ou recuse os jogadores que pediram para entrar no time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pedidos.map((pedido) => (
          <div key={pedido.id} className="rounded-lg border border-border/60 p-3 space-y-3">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={pedido.requester_avatar ?? undefined} alt="" />
                <AvatarFallback>{pedido.requester_name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{pedido.requester_name}</p>
                <p className="text-xs text-muted-foreground truncate">{pedido.requester_email}</p>
                <p className="text-sm mt-2 whitespace-pre-wrap">
                  {pedido.requester_name} deseja entrar no seu time.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Motivo (opcional, se recusar)"
                value={motivos[pedido.id] ?? ""}
                onChange={(e) => setMotivos((m) => ({ ...m, [pedido.id]: e.target.value }))}
                className="h-9"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => aceitar(pedido)}
                  disabled={processando === pedido.id}
                >
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
      </CardContent>
    </Card>
  );
}
