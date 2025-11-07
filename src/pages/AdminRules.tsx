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
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
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

interface Rule {
  id: string;
  event_id: string;
  title: string;
  content: string;
  display_order: number;
}

const AdminRules = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [rules, setRules] = useState<Rule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "admin") {
      navigate("/");
      return;
    }
    fetchEvents();
  }, [user, role, navigate]);

  useEffect(() => {
    if (selectedEventId) {
      fetchRules();
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

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from("event_rules")
      .select("*")
      .eq("event_id", selectedEventId)
      .order("display_order");

    if (!error && data) {
      setRules(data);
    }
  };

  const handleCreateRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const maxOrder = rules.length > 0 ? Math.max(...rules.map(r => r.display_order)) : -1;

    const { error } = await supabase
      .from("event_rules")
      .insert({
        event_id: selectedEventId,
        title: formData.get("title") as string,
        content: formData.get("content") as string,
        display_order: maxOrder + 1,
      });

    if (error) {
      toast.error("Erro ao criar regra");
    } else {
      toast.success("Regra criada com sucesso!");
      setDialogOpen(false);
      fetchRules();
    }
  };

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase
      .from("event_rules")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover regra");
    } else {
      toast.success("Regra removida");
      fetchRules();
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const currentIndex = rules.findIndex(r => r.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const newRules = [...rules];
    [newRules[currentIndex], newRules[targetIndex]] = [newRules[targetIndex], newRules[currentIndex]];

    const updates = newRules.map((rule, index) => ({
      id: rule.id,
      display_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("event_rules")
        .update({ display_order: update.display_order })
        .eq("id", update.id);
    }

    fetchRules();
    toast.success("Ordem atualizada");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Regras</h1>
            <p className="text-muted-foreground">
              Configure as regras do evento
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
              <CardTitle>Regras</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Regra
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Criar Nova Regra</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateRule} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título</Label>
                      <Input id="title" name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="content">Conteúdo</Label>
                      <Textarea id="content" name="content" rows={4} required />
                    </div>
                    <Button type="submit">Criar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rules.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma regra cadastrada
                  </p>
                ) : (
                  rules.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="flex items-start gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{rule.title}</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {rule.content}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(rule.id, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReorder(rule.id, "down")}
                          disabled={index === rules.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRule(rule.id)}
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

export default AdminRules;
