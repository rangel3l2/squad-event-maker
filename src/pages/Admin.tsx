import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calendar, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  is_active: boolean;
}

const Admin = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (role !== 'admin') {
      toast.error("Acesso negado - apenas administradores");
      navigate("/");
      return;
    }

    fetchEvents();
  }, [user, role, navigate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar eventos");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const eventDate = formData.get("event_date") as string;
    const allowedEmailDomain = formData.get("allowed_email_domain") as string;

    try {
      const { error } = await supabase
        .from('events')
        .insert({
          name,
          description,
          event_date: eventDate,
          created_by: user!.id,
          is_active: true,
          allowed_email_domain: allowedEmailDomain || null,
        });

      if (error) throw error;

      toast.success("Evento criado com sucesso!");
      setIsDialogOpen(false);
      fetchEvents();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error("Erro ao criar evento: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success("Evento excluído com sucesso!");
      fetchEvents();
    } catch (error: any) {
      toast.error("Erro ao excluir evento: " + error.message);
    }
  };

  const toggleEventStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentStatus })
        .eq('id', eventId);

      if (error) throw error;

      toast.success(`Evento ${!currentStatus ? 'ativado' : 'desativado'} com sucesso!`);
      fetchEvents();
    } catch (error: any) {
      toast.error("Erro ao atualizar evento: " + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
              <p className="text-muted-foreground">Gerencie eventos e times</p>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-primary hover:opacity-90 shadow-glow">
                  <Plus className="w-5 h-5 mr-2" />
                  Novo Evento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Novo Evento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Evento</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Torneio Interclasse 2024"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Descreva o evento..."
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_date">Data e Hora</Label>
                    <Input
                      id="event_date"
                      name="event_date"
                      type="datetime-local"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allowed_email_domain">
                      Domínio de Email Permitido (Opcional)
                    </Label>
                    <Input
                      id="allowed_email_domain"
                      name="allowed_email_domain"
                      type="text"
                      placeholder="ex: estudante.ifms.edu.br"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para permitir todos os domínios
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-accent hover:opacity-90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Criando..." : "Criar Evento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="shadow-card border-border/50 backdrop-blur">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{event.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={event.is_active ? "outline" : "default"}
                      size="sm"
                      className="flex-1"
                      onClick={() => toggleEventStatus(event.id, event.is_active)}
                    >
                      {event.is_active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {events.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="pt-6 text-center py-12">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum evento cadastrado</p>
                <p className="text-muted-foreground">
                  Clique em "Novo Evento" para começar
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default Admin;
