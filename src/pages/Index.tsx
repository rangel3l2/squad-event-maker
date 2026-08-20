import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { HeroCarousel } from "@/components/HeroCarousel";
import { TeamsDashboard } from "@/components/TeamsDashboard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trophy, BookOpen } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  is_active: boolean;
  logo_url?: string;
  edition?: string;
}

interface Rule {
  id: string;
  title: string;
  content: string;
}

interface Prize {
  id: string;
  position: number;
  title: string;
  description: string | null;
  prize_details: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isUserRegistered, setIsUserRegistered] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    fetchData();
    checkUserRegistration();
  }, [user]);

  const checkUserRegistration = async () => {
    if (!user) {
      setIsUserRegistered(false);
      setCheckingUser(false);
      return;
    }

    try {
      const { listarUsuarios } = await import("@/services/api");
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);
      setIsUserRegistered(!!usuario);
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
      setIsUserRegistered(false);
    } finally {
      setCheckingUser(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, description, event_date, is_active, copa_year, logo_url, edition')
        .eq('is_active', true)
        .order('event_date', { ascending: true });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      if (eventsData && eventsData.length > 0) {
        const firstEventId = eventsData[0].id;
        setActiveEventId(firstEventId);

        const { data: rulesData } = await supabase
          .from('event_rules')
          .select('*')
          .eq('event_id', firstEventId)
          .order('display_order');

        const { data: prizesData } = await supabase
          .from('event_prizes')
          .select('*')
          .eq('event_id', firstEventId)
          .order('display_order');

        setRules(rulesData || []);
        setPrizes(prizesData || []);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
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

      {/* Hero Section - vídeo ajustado */}
      <section className="relative flex flex-col -mt-20 pt-20 h-[80vh] text-center bg-gradient-to-b from-background to-card overflow-hidden">
        <div className="flex-1 flex flex-col w-full h-full">
          <HeroCarousel />
        </div>
      </section>


      {/* CTA Section - Cadastre-se Agora - Apenas para não cadastrados */}
      {!checkingUser && !isUserRegistered && (
        <section className="py-20 px-4 bg-gradient-to-b from-primary/10 via-secondary/10 to-accent/10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Cadastre-se Agora!
                </h2>
                <p className="text-xl md:text-2xl text-muted-foreground mb-8">
                  Entre para a maior competição de futebol entre turmas
                </p>
              </div>
              
              {!user ? (
                <Card className="border-2 border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Comece sua jornada</CardTitle>
                    <CardDescription className="text-lg">
                      Siga os passos para participar
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">1</span>
                        <span>Login</span>
                      </div>
                      <span className="text-2xl">→</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">2</span>
                        <span>Cadastro</span>
                      </div>
                      <span className="text-2xl">→</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold">3</span>
                        <span>Escolher Time</span>
                      </div>
                    </div>
                    <Button onClick={() => navigate("/auth")} size="lg" className="w-full text-lg h-14">
                      Começar Cadastro
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-primary/20 shadow-glow">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Complete seu Cadastro!</CardTitle>
                    <CardDescription className="text-lg">
                      Preencha suas informações para continuar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => navigate("/complete-profile")} size="lg" className="w-full text-lg h-14">
                      Completar Cadastro
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Teams Dashboard Section */}
      <section className="py-16 px-4 bg-card/30">
        <div className="max-w-7xl mx-auto">
          <TeamsDashboard />
        </div>
      </section>


      {/* Rules Section */}
      {rules.length > 0 && (
        <section className="py-16 px-4 bg-card/30">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-12">
              <BookOpen className="h-10 w-10 text-primary" />
              <h2 className="text-3xl md:text-4xl font-bold text-center">
                Regras do Evento
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {rules.map((rule, index) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-primary">{index + 1}.</span>
                      {rule.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {rule.content}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prizes Section */}
      {prizes.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-3 mb-12">
              <Trophy className="h-10 w-10 text-yellow-500" />
              <h2 className="text-3xl md:text-4xl font-bold text-center">
                Premiações
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {prizes.map((prize) => (
                <Card key={prize.id} className="hover:shadow-glow transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-center mb-4">
                      <Trophy className={`h-16 w-16 ${getPositionColor(prize.position)}`} />
                    </div>
                    <CardTitle className="text-center">{prize.title}</CardTitle>
                    {prize.description && (
                      <CardDescription className="text-center">
                        {prize.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-center whitespace-pre-wrap">
                      {prize.prize_details}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

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
                <CardTitle>2. Complete seu Cadastro</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Preencha seus dados pessoais: nome, CPF, turma e grupo
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>3. Escolha seu Time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Crie seu próprio time ou entre em um time já existente
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>4. Participe</CardTitle>
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
    </div>
  );
};

export default Index;
