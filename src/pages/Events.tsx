import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  is_active: boolean;
}

const Events = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchEvents();
  }, [user, navigate]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar eventos");
      console.error(error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando eventos...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Eventos Disponíveis</h1>
              <p className="text-muted-foreground">
                Escolha um evento e crie seu time!
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-6 text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum evento disponível</p>
                <p className="text-muted-foreground">
                  Aguarde novos eventos serem criados pelo administrador
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="shadow-card hover:shadow-glow transition-all cursor-pointer border-border/50 backdrop-blur group"
                  onClick={() => navigate(`/event/${event.id}`)}
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Trophy className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-2xl">{event.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {event.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    <Button className="w-full bg-gradient-accent hover:opacity-90">
                      <Users className="w-4 h-4 mr-2" />
                      Ver Times
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Events;
