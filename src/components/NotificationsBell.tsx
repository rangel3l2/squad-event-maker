import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { JoinRequestsList, usePedidosRecebidos } from "@/components/teams/JoinRequestsList";

/** Sininho de notificações: solicitações pendentes recebidas pelo capitão. */
export function NotificationsBell() {
  const { user } = useAuth();
  const { pedidos, recarregar } = usePedidosRecebidos();

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notificações">
          <Bell className="w-4 h-4" />
          {pedidos.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {pedidos.length > 9 ? "9+" : pedidos.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <p className="font-semibold text-sm mb-2">Solicitações recebidas</p>
        {pedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
        ) : (
          <ScrollArea className="max-h-96 pr-2">
            <JoinRequestsList pedidos={pedidos} onChanged={recarregar} compact />
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
