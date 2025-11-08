import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Users, Search, CheckCircle, Lock } from "lucide-react";
import { listarTimes, adicionarIntegrante, listarUsuarios } from "@/services/api";

interface Team {
  id: number;
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
  const [isJoining, setIsJoining] = useState<number | null>(null);

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
      const timesData = await listarTimes();
      
      // Transformar para o formato esperado
      const teamsWithCount = timesData.map(time => ({
        id: time.id!,
        name: time.nome,
        logo_url: time.url_image_perfil,
        description: null,
        member_count: 0, // TODO: implementar contagem via API quando disponível
      }));

      setTeams(teamsWithCount);
      setFilteredTeams(teamsWithCount);
    } catch (error) {
      console.error("Error loading teams:", error);
      toast.error("Erro ao carregar times");
    }
  };

  const handleJoinTeam = async (teamId: number, teamName: string, memberCount: number) => {
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
      // Verificar se usuário já tem perfil completo via API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.token_gmail === user.id);

      if (!usuario) {
        toast.error("Complete seu perfil primeiro");
        navigate("/complete-profile");
        return;
      }

      // Entrar no time via API
      await adicionarIntegrante(teamId, {
        usuario_id: usuario.id!,
        funcao: "Membro",
      });

      toast.success(`Você entrou no time ${teamName} com sucesso!`);
      onSuccess();
    } catch (error: any) {
      console.error("Error joining team:", error);
      toast.error("Erro ao entrar no time: " + error.message);
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
