import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Users, PlusCircle, AlertCircle, Search, KeyRound } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { listarUsuarios, mostrarTimeUsuario, listarTimes, adicionarIntegrante, type Time } from "@/services/api";

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
  const [quickInviteCode, setQuickInviteCode] = useState("");
  const [isJoiningQuick, setIsJoiningQuick] = useState(false);

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

  const handleQuickJoin = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!quickInviteCode.trim()) {
      toast.error("Digite o código de convite");
      return;
    }

    setIsJoiningQuick(true);

    try {
      // Verificar se usuário já tem perfil completo
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario) {
        toast.error("Você precisa completar seu cadastro primeiro para entrar em um time");
        navigate("/complete-profile");
        return;
      }

      // Verificar se já tem time
      if (hasTeam) {
        toast.error("Você deve sair do seu time atual para conseguir entrar em outro time");
        return;
      }

      // Buscar todos os times para encontrar o que tem esse código
      const times = await listarTimes();
      const timeEncontrado = times.find(t => t.senha_convite === quickInviteCode.trim());

      if (!timeEncontrado) {
        toast.error("Código de convite inválido");
        return;
      }

      // Verificar se o time já tem 4 integrantes
      const integrantesCount = timeEncontrado.integrantes?.length || 0;
      
      if (integrantesCount >= 4) {
        toast.error("Este time já atingiu o limite máximo de 4 membros");
        return;
      }

      // Verificar se o usuário já é membro do time
      const jaEhMembro = timeEncontrado.integrantes?.some(
        (integrante: any) => integrante.usuario_id === usuario.id
      );
      
      if (jaEhMembro) {
        toast.error("Você já é membro deste time");
        return;
      }

      // Entrar no time
      await adicionarIntegrante(timeEncontrado.id!, {
        usuario_id: usuario.id!,
        funcao: "Membro",
      });

      toast.success(`Você entrou no time "${timeEncontrado.nome_time}" com sucesso!`);
      setQuickInviteCode("");
      setRefreshKey(prev => prev + 1);
      
      // Recarregar para atualizar o status de hasTeam
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao entrar no time:", error);
      toast.error("Erro ao entrar no time: " + error.message);
    } finally {
      setIsJoiningQuick(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Frontend Teams Cup</h1>
        
        {mode === "select" && (
          <>
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Card de Código Rápido */}
              <Card className="border-primary/50">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-6 h-6 text-primary" />
                    <CardTitle>Entrar com Código de Convite</CardTitle>
                  </div>
                  <CardDescription>
                    Digite o código que você recebeu para entrar rapidamente em um time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hasTeam ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Você já está no time "{currentTeamName}". Você deve sair do seu time atual para conseguir entrar em outro time.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Digite o código aqui"
                        value={quickInviteCode}
                        onChange={(e) => setQuickInviteCode(e.target.value)}
                        className="font-mono text-lg text-center"
                        disabled={isJoiningQuick}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && quickInviteCode.trim()) {
                            handleQuickJoin();
                          }
                        }}
                      />
                      <Button 
                        onClick={handleQuickJoin}
                        disabled={isJoiningQuick || !quickInviteCode.trim()}
                        size="lg"
                      >
                        {isJoiningQuick ? "Entrando..." : "Entrar"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Cards de Ações */}
              {!hasTeam && (
                <div className="grid md:grid-cols-2 gap-6">
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

              {hasTeam && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-lg">
                    Você já está no time "{currentTeamName}". Para entrar em outro time ou criar um novo, primeiro saia do seu time atual.
                  </AlertDescription>
                </Alert>
              )}
            </div>
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