import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  is_active: boolean;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

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

  const handleEventClick = (eventId: string) => {
    if (!user) {
      toast.info("Faça login para participar do evento");
      navigate("/auth");
      return;
    }
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-background to-card">
        <div className="max-w-5xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Frontend Teams Cup
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            A maior competição de futebol entre turmas de desenvolvimento web
          </p>
          <HeroCarousel />
        </div>
      </section>

      {/* Available Events Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Edições da Copa
          </h2>
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              Nenhum evento disponível no momento
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="hover:shadow-glow transition-shadow cursor-pointer"
                  onClick={() => handleEventClick(event.id)}
                >
                  <CardHeader>
                    <CardTitle>{event.name}</CardTitle>
                    <CardDescription>{event.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.event_date)}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button className="w-full">Ver Times</Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Faça Login</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Entre com sua conta do Google para acessar os eventos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>2. Crie seu Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Monte sua equipe e personalize o logo do seu time
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>3. Participe</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Participe dos eventos e dispute a Copa!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {!user && (
        <section className="py-16 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Card>
              <CardHeader>
                <CardTitle className="text-3xl">Pronto para começar?</CardTitle>
                <CardDescription>
                  Faça login para participar dos eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => navigate("/auth")} size="lg">
                  Entrar Agora
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
