import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Search, CheckCircle, Lock } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logo_url: string;
  description: string | null;
  member_count: number;
}

interface JoinTeamFormProps {
  onSuccess: () => void;
}

const MAX_MEMBERS_PER_TEAM = 3;

export function JoinTeamForm({ onSuccess }: JoinTeamFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isJoining, setIsJoining] = useState<string | null>(null);

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTeams(teams);
    } else {
      const filtered = teams.filter((team) =>
        team.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, teams]);

  const loadTeams = async () => {
    try {
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!events) {
        toast.error("Nenhum evento ativo encontrado");
        return;
      }

      // Buscar times com contagem de membros
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, logo_url, description")
        .eq("event_id", events.id)
        .order("name");

      if (!teamsData) return;

      // Buscar contagem de membros para cada time
      const teamsWithCount = await Promise.all(
        teamsData.map(async (team) => {
          const { count } = await supabase
            .from("team_members")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);

          return {
            ...team,
            member_count: count || 0,
          };
        })
      );

      setTeams(teamsWithCount);
      setFilteredTeams(teamsWithCount);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast.error("Erro ao carregar times");
    }
  };

  const handleJoinTeam = async (teamId: string, teamName: string, memberCount: number) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (memberCount >= MAX_MEMBERS_PER_TEAM) {
      toast.error("Este time já está completo (máximo 3 membros)");
      return;
    }

    setIsJoining(teamId);

    try {
      // Verificar se usuário já tem perfil completo
      const { data: profile } = await supabase
        .from("profiles")
        .select("cpf, full_name")
        .eq("id", user.id)
        .single();

      if (!profile?.cpf || !profile?.full_name) {
        toast.error("Complete seu perfil primeiro");
        navigate("/complete-profile");
        return;
      }

      // Verificar se já está em um time
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast.error("Você já está em um time. Saia do time atual para entrar em outro.");
        return;
      }

      // Buscar dados adicionais do perfil para classroom e classroom_group
      const { data: memberData } = await supabase
        .from("team_members")
        .select("classroom, classroom_group")
        .eq("user_id", user.id)
        .single();

      // Se não tiver classroom, pedir para completar
      if (!memberData?.classroom) {
        toast.error("Complete suas informações de turma no perfil");
        navigate("/complete-profile");
        return;
      }

      // Entrar no time
      const { error: joinError } = await supabase
        .from("team_members")
        .insert({
          team_id: teamId,
          user_id: user.id,
          classroom: memberData.classroom,
          classroom_group: memberData.classroom_group,
        });

      if (joinError) throw joinError;

      toast.success(`Você entrou no time ${teamName} com sucesso!`);
      onSuccess();
    } catch (error: any) {
      console.error("Error joining team:", error);
      if (error.code === "23505") {
        toast.error("Você já está neste time");
      } else {
        toast.error("Erro ao entrar no time: " + error.message);
      }
    } finally {
      setIsJoining(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Escolha seu Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar time por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time disponível"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const isFull = team.member_count >= MAX_MEMBERS_PER_TEAM;
            const isCurrentlyJoining = isJoining === team.id;

            return (
              <Card
                key={team.id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  isFull ? "opacity-60" : ""
                }`}
              >
                <div className="absolute top-4 right-4 z-10">
                  <Badge variant={isFull ? "destructive" : "secondary"} className="flex items-center gap-1">
                    {isFull ? (
                      <>
                        <Lock className="w-3 h-3" />
                        Completo
                      </>
                    ) : (
                      <>
                        <Users className="w-3 h-3" />
                        {team.member_count}/{MAX_MEMBERS_PER_TEAM}
                      </>
                    )}
                  </Badge>
                </div>

                <CardHeader className="pb-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-32 h-32 rounded-lg overflow-hidden border-4 border-border shadow-lg">
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardTitle className="text-xl text-center">{team.name}</CardTitle>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {team.description && (
                    <p className="text-sm text-muted-foreground text-center line-clamp-2">
                      {team.description}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={() => handleJoinTeam(team.id, team.name, team.member_count)}
                    disabled={isFull || isCurrentlyJoining}
                  >
                    {isCurrentlyJoining ? (
                      "Entrando..."
                    ) : isFull ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Time Completo
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Entrar no Time
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
