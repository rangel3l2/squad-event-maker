import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Calendar, Palette, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

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
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-16 pb-12 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 backdrop-blur">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-semibold">Squad Event Maker</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
              Escolha um Evento e{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Monte seu Time
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Participe de eventos escolares, crie times personalizados com logo customizado
              e organize suas equipes de forma simples e divertida!
            </p>
          </div>
        </section>

        {/* Events Section */}
        <section className="container mx-auto px-4 pb-20">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando eventos...</p>
              </div>
            </div>
          ) : events.length === 0 ? (
            <Card className="shadow-card max-w-2xl mx-auto">
              <CardContent className="pt-6 text-center py-12">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum evento disponível no momento</p>
                <p className="text-muted-foreground mb-6">
                  Aguarde novos eventos serem criados
                </p>
                {!user && (
                  <Button 
                    onClick={() => navigate("/auth")}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    Fazer Login
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2">Eventos Disponíveis</h2>
                <p className="text-muted-foreground">
                  Clique em um evento para ver os times e participar
                </p>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
                {events.map((event) => (
                  <Card
                    key={event.id}
                    className="shadow-card hover:shadow-glow transition-all cursor-pointer border-border/50 backdrop-blur group"
                    onClick={() => handleEventClick(event.id)}
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
                      <Button className="w-full bg-gradient-accent hover:opacity-90 group-hover:translate-x-1 transition-transform">
                        <Users className="w-4 h-4 mr-2" />
                        Ver Times e Participar
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 pb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Como Funciona</h2>
            <p className="text-muted-foreground">
              Tudo que você precisa para criar times incríveis
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">1. Escolha o Evento</h3>
              <p className="text-muted-foreground">
                Navegue pelos eventos disponíveis e escolha qual você quer participar
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">2. Crie seu Time</h3>
              <p className="text-muted-foreground">
                Monte sua equipe, crie um logo personalizado com IA ou editor visual
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">3. Participe!</h3>
              <p className="text-muted-foreground">
                Gerencie membros, personalize cores e prepare-se para o evento
              </p>
            </div>
          </div>
        </section>

        {!user && (
          <section className="container mx-auto px-4 pb-20">
            <Card className="max-w-2xl mx-auto text-center shadow-glow border-primary/20">
              <CardContent className="pt-8 pb-8">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h3 className="text-2xl font-bold mb-2">Pronto para começar?</h3>
                <p className="text-muted-foreground mb-6">
                  Faça login ou crie sua conta para participar dos eventos
                </p>
                <Button 
                  onClick={() => navigate("/auth")}
                  size="lg"
                  className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8"
                >
                  Entrar Agora
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </>
  );
};

export default Index;
