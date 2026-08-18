import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Users, PlusCircle, AlertCircle, Search } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios, mostrarTimeUsuario, listarTimes, type Time } from "@/services/api";

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [hasTeam, setHasTeam] = useState(false);
  const [currentTeamName, setCurrentTeamName] = useState<string>("");
  const [allTeams, setAllTeams] = useState<Time[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Time[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Verificar se completou o cadastro e se já está em um time
    const checkProfile = async () => {
      try {
        // Verificar perfil completo via API
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          navigate("/complete-profile");
          return;
        }

        console.log("=== VERIFICANDO SE USUÁRIO JÁ ESTÁ EM UM TIME ===");
        console.log("ID do usuário:", usuario.id);

        // Verificar se é dono de algum time
        try {
          const timeUsuario = await mostrarTimeUsuario(usuario.id!);
          
          if (timeUsuario && timeUsuario.id != null) {
            console.log("Usuário é DONO do time:", timeUsuario.nome_time);
            setHasTeam(true);
            setCurrentTeamName(timeUsuario.nome_time || "");
            return;
          }
        } catch (error) {
          console.log("Usuário não é dono de nenhum time");
        }

        // Verificar se é integrante de algum time
        const times = await listarTimes();
        console.log("Total de times listados:", times.length);
        
        for (const time of times) {
          const integrantes = time.integrantes || [];
          console.log(`Time "${time.nome_time}" tem ${integrantes.length} integrantes`);
          
          const ehIntegrante = integrantes.some(
            (integrante: any) => integrante.usuario_id === usuario.id
          );
          
          if (ehIntegrante) {
            console.log("Usuário é INTEGRANTE do time:", time.nome_time);
            setHasTeam(true);
            setCurrentTeamName(time.nome_time);
            return;
          }
        }

        console.log("Usuário NÃO está em nenhum time");
        setHasTeam(false);
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [user, navigate]);

  // Carregar todos os times
  useEffect(() => {
    const loadTeams = async () => {
      try {
        console.log("Carregando times...");
        const times = await listarTimes();
        console.log("Times carregados:", times.length);
        setAllTeams(times);
        setFilteredTeams(times);
      } catch (error) {
        console.error("Erro ao carregar times:", error);
      }
    };
    
    loadTeams();
  }, [refreshKey]); // Recarrega quando refreshKey mudar

  // Filtrar times conforme busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTeams(allTeams);
    } else {
      const filtered = allTeams.filter(time =>
        time.nome_time.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeams(filtered);
    }
  }, [searchTerm, allTeams]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {mode === "select" && (
          <>
            {hasTeam ? (
              <div className="max-w-2xl mx-auto">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-lg">
                    Você já está no time "{currentTeamName}". Para entrar em outro time ou criar um novo, primeiro saia do seu time atual.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode("join")}>
                  <CardHeader>
                    <Users className="w-12 h-12 mb-4 text-primary" />
                    <CardTitle>Entrar em um Time</CardTitle>
                    <CardDescription>
                      Escolha um time existente e cadastre suas informações para participar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Selecionar</Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode("create")}>
                  <CardHeader>
                    <PlusCircle className="w-12 h-12 mb-4 text-primary" />
                    <CardTitle>Criar Novo Time</CardTitle>
                    <CardDescription>
                      Crie seu próprio time com logo, nome e informações personalizadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Criar Time</Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {mode === "create" && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => setMode("select")} className="mb-4">
              ← Voltar
            </Button>
            <CreateTeamForm onSuccess={() => {
              setMode("select");
              setRefreshKey(prev => prev + 1); // Força atualização da lista
            }} />
          </div>
        )}

        {mode === "join" && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => setMode("select")} className="mb-4">
              ← Voltar
            </Button>
            <JoinTeamForm onSuccess={() => {
              setMode("select");
              setRefreshKey(prev => prev + 1); // Força atualização da lista
            }} />
          </div>
        )}

        {/* Lista de Times Cadastrados */}
        <div className="max-w-6xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6" />
                Times Cadastrados
              </CardTitle>
              <CardDescription>
                Explore todos os times participantes da competição
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Campo de busca */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar time pelo nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Grid de Times */}
              {filteredTeams.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time cadastrado ainda"}
                </p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTeams.map((time) => (
                    <Card
                      key={time.id}
                      className="hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                      onClick={() => navigate(`/team-details/${time.id}`)}
                    >
                      <CardHeader className="text-center pb-3">
                        {time.imagem_time && (
                          <div className="flex justify-center mb-3">
                            <img
                              src={time.imagem_time}
                              alt={`Logo ${time.nome_time}`}
                              className="w-24 h-24 object-contain rounded-lg"
                            />
                          </div>
                        )}
                        <CardTitle className="text-lg">{time.nome_time}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{time.qtd_integrantes ?? time.quantidade ?? 0}/4 membros</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}