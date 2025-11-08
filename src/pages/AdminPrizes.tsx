import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ArrowUp, ArrowDown, Plus, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Event {
  id: string;
  name: string;
}

interface Prize {
  id: string;
  event_id: string;
  position: number;
  title: string;
  description: string | null;
  prize_details: string;
  display_order: number;
}

const AdminPrizes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchEvents();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedEventId) {
      fetchPrizes();
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, name")
      .order("event_date", { ascending: false });

    if (!error && data) {
      setEvents(data);
      if (data.length > 0) {
        setSelectedEventId(data[0].id);
      }
    }
  };

  const fetchPrizes = async () => {
    const { data, error } = await supabase
      .from("event_prizes")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("display_order");

    if (!error && data) {
      setPrizes(data);
    }
  };

  const handleCreatePrize = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const maxOrder = prizes.length > 0 ? Math.max(...prizes.map(p => p.display_order)) : -1;

    const { error } = await supabase
      .from("event_prizes")
      .insert({
        event_id: selectedEventId,
        position: parseInt(formData.get("position") as string),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        prize_details: formData.get("prize_details") as string,
        display_order: maxOrder + 1,
      });

    if (error) {
      toast.error("Erro ao criar premiação");
    } else {
      toast.success("Premiação criada com sucesso!");
      setDialogOpen(false);
      fetchPrizes();
    }
  };

  const handleDeletePrize = async (id: string) => {
    const { error } = await supabase
      .from("event_prizes")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover premiação");
    } else {
      toast.success("Premiação removida");
      fetchPrizes();
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = prizes.findIndex(p => p.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= prizes.length) return;

    const newPrizes = [...prizes];
    [newPrizes[currentIndex], newPrizes[targetIndex]] = [newPrizes[targetIndex], newPrizes[currentIndex]];

    const updates = newPrizes.map((prize, index) => ({
      id: prize.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("event_prizes")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    fetchPrizes();
    toast.success("Ordem atualizada");
  };

  const getPositionColor = (position: number) => {
    switch (position) {
      case 1: return "text-yellow-500";
      case 2: return "text-gray-400";
      case 3: return "text-amber-700";
      default: return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Premiações</h1>
            <p className="text-muted-foreground">
              Configure as premiações do evento
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Selecionar Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {events.map((event) => (
                  <Button
                    key={event.id}
                    variant={selectedEventId === event.id ? "default" : "outline"}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    {event.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Premiações</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Premiação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Premiação</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePrize} className="space-y-4">
                    <div>
                      <Label htmlFor="position">Posição</Label>
                      <Input id="position" name="position" type="number" min="1" required />
                    </div>
                    <div>
                      <Label htmlFor="title">Título</Label>
                      <Input id="title" name="title" placeholder="Ex: 1º Lugar" required />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Input id="description" name="description" placeholder="Descrição curta (opcional)" />
                    </div>
                    <div>
                      <Label htmlFor="prize_details">Detalhes da Premiação</Label>
                      <Textarea id="prize_details" name="prize_details" rows={3} required />
                    </div>
                    <Button type="submit">Criar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prizes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma premiação cadastrada
                  </p>
                ) : (
                  prizes.map((prize, index) => (
                    <div
                      key={prize.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <Trophy className={`h-8 w-8 ${getPositionColor(prize.position)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{prize.title}</h3>
                          <span className="text-sm text-muted-foreground">({prize.position}º lugar)</span>
                        </div>
                        {prize.description && (
                          <p className="text-sm text-muted-foreground mb-2">{prize.description}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{prize.prize_details}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(prize.id, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(prize.id, "down")}
                          disabled={index === prizes.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrize(prize.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminPrizes;
