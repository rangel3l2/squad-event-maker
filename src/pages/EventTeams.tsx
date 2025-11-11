import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, Plus } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";

interface Team {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  description: string | null;
  captain_id: string | null;
  member_count?: number;
}

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
}

const EventTeams = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!eventId) {
      navigate("/events");
      return;
    }

    fetchEventAndTeams();
  }, [user, eventId, navigate]);

  const fetchEventAndTeams = async () => {
    try {
      // Buscar informações do evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Buscar times do evento com contagem de membros
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          team_members(count)
        `)
        .eq('event_id', eventId);

      if (teamsError) throw teamsError;

      const teamsWithCount = teamsData?.map(team => ({
        ...team,
        member_count: team.team_members?.[0]?.count || 0
      })) || [];

      setTeams(teamsWithCount);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar informações do evento");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando times...</p>
          </div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl font-semibold mb-4">Evento não encontrado</p>
            <Button onClick={() => navigate("/events")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Eventos
            </Button>
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
          {/* Header do Evento */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/events")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para Eventos
            </Button>
            
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{event.name}</h1>
                <p className="text-muted-foreground mb-2">{event.description}</p>
                <p className="text-sm text-muted-foreground">
                  Data do evento: {formatDate(event.event_date)}
                </p>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/teams')}
              className="bg-gradient-accent hover:opacity-90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar ou Entrar em um Time
            </Button>
          </div>

          {/* Lista de Times */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold">Times Participantes</h2>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {teams.length} {teams.length === 1 ? 'time' : 'times'}
              </Badge>
            </div>
          </div>

          {teams.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-6 text-center py-12">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum time cadastrado ainda</p>
                <p className="text-muted-foreground mb-4">
                  Seja o primeiro a criar um time para este evento!
                </p>
                <Button 
                  onClick={() => navigate('/teams')}
                  className="bg-gradient-accent hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Time
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Carousel
              plugins={[
                Autoplay({
                  delay: 3000,
                  stopOnInteraction: true,
                }),
              ]}
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent>
                {teams.map((team) => (
                  <CarouselItem key={team.id} className="md:basis-1/2 lg:basis-1/3">
                    <div className="p-2">
                      <Card 
                        className="hover:shadow-glow transition-all duration-300 hover:scale-105 cursor-pointer"
                        onClick={() => navigate(`/team-details/${team.id}`)}
                      >
                        <CardHeader className="pb-4">
                          <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20">
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <CardTitle className="text-center text-xl">
                            {team.name}
                          </CardTitle>
                          {team.description && (
                            <p className="text-sm text-muted-foreground text-center line-clamp-2">
                              {team.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="text-center">
                          <Badge variant="secondary" className="text-sm">
                            <Users className="w-3 h-3 mr-1" />
                            {team.member_count} {team.member_count === 1 ? 'membro' : 'membros'}
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          )}
        </div>
      </div>
    </>
  );
};

export default EventTeams;
