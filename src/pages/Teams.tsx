import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, PlusCircle, AlertCircle, Search, History } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios, listarTimes, listarSedesPorEvento, EVENTO_ATUAL, buscarTimesPorDono, type Sede, type Time, type Usuario } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Teams() {
  const navigate = useNavigate();
  const location = useLocation();
  const timeParaDuplicar = (location.state as { duplicarTime?: Time } | null)?.duplicarTime ?? null;
  const { user } = useAuth();
  const [mode, setMode] = useState<"select" | "create" | "join">(timeParaDuplicar ? "create" : "select");
  const [hasTeam, setHasTeam] = useState(false);
  const [currentTeamName, setCurrentTeamName] = useState<string>("");
  const [myTeam, setMyTeam] = useState<Time | null>(null);
  const [pastTeams, setPastTeams] = useState<Time[]>([]);
  const [allTeams, setAllTeams] = useState<Time[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<Time[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeFiltro, setSedeFiltro] = useState<string>("todas");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Verificar se completou o cadastro e se já está em um time DO EVENTO ATUAL
    const checkProfile = async () => {
      try {
        // Verificar perfil completo via API
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          navigate("/complete-profile");
          return;
        }

        console.log("=== VERIFICANDO SE USUÁRIO JÁ ESTÁ EM UM TIME DESTE EVENTO ===");
        console.log("ID do usuário:", usuario.id, "Evento atual:", EVENTO_ATUAL);

        // Buscar todos os times do usuário em todos os eventos
        let currentTeam: Time | null = null;
        const previousTeams: Time[] = [];

        // Verificar se é dono de algum time em qualquer evento
        try {
          const timesDoDono = await buscarTimesPorDono(usuario.id!, null);
          for (const t of timesDoDono) {
            if (t.id == null) continue;
            if (Number(t.evento) === Number(EVENTO_ATUAL)) {
              currentTeam = t;
            } else {
              previousTeams.push(t);
            }
          }
        } catch (error) {
          console.log("Usuário não é dono de nenhum time");
        }

        // Verificar se é integrante de algum time em qualquer evento
        const todosOsTimes = await listarTimes({ evento: null });
        for (const time of todosOsTimes) {
          const integrantes = time.integrantes || [];
          const ehIntegrante = integrantes.some(
            (integrante: any) => integrante.usuario_id === usuario.id
          );
          if (!ehIntegrante) continue;

          if (Number(time.evento) === Number(EVENTO_ATUAL)) {
            if (!currentTeam) currentTeam = time;
          } else {
            if (!previousTeams.some((t) => t.id === time.id)) {
              previousTeams.push(time);
            }
          }
        }

        if (currentTeam) {
          console.log("Usuário está no time deste evento:", currentTeam.nome_time);
          setHasTeam(true);
          setCurrentTeamName(currentTeam.nome_time || "");
          setMyTeam(currentTeam);
        } else {
          console.log("Usuário NÃO está em nenhum time neste evento");
          setHasTeam(false);
          setMyTeam(null);
        }

        setPastTeams(previousTeams);
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [user, navigate]);

  // Carregar sedes do evento e sugerir a sede do usuário
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const listaSedes = await listarSedesPorEvento(EVENTO_ATUAL);
        if (cancelled) return;
        setSedes(listaSedes);
        const usuarios = await listarUsuarios();
        const minhaSede = usuarios.find((u) => u.email === user.email)?.sede;
        if (!cancelled && minhaSede) setSedeFiltro(String(minhaSede));
      } catch (error) {
        console.error("Erro ao carregar sedes:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  // Carregar times do evento atual (filtrando pela sede escolhida)
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const times = await listarTimes({
          evento: EVENTO_ATUAL,
          sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
        });
        setAllTeams(times);
        setFilteredTeams(times);
      } catch (error) {
        console.error("Erro ao carregar times:", error);
      }
    };

    loadTeams();
  }, [refreshKey, sedeFiltro]); // Recarrega quando refreshKey ou sede mudar

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

  const renderTeamCard = (time: Time, isCurrent: boolean) => (
    <Card
      className={`hover:shadow-lg transition-all cursor-pointer ${isCurrent ? "border-primary/40" : ""}`}
      onClick={() => time.id != null && navigate(`/team-details/${time.id}`)}
    >
      <CardContent className="flex items-center gap-3 py-4">
        {time.imagem_time && (
          <img
            src={time.imagem_time}
            alt={`Logo ${time.nome_time}`}
            className="w-12 h-12 object-contain rounded-lg flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0 text-left">
          <p className="font-semibold truncate">{time.nome_time}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {time.qtd_integrantes ?? time.quantidade ?? 0}/4 membros
          </p>
          {!isCurrent && time.evento != null && (
            <p className="text-xs text-muted-foreground">Edição {time.evento}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {mode === "create" && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => setMode("select")} className="mb-4">
              ← Voltar
            </Button>
            <CreateTeamForm timeParaDuplicar={timeParaDuplicar} onSuccess={(teamId) => {
              setMode("select");
              setRefreshKey(prev => prev + 1);
              if (teamId != null) navigate(`/team-details/${teamId}`);
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

        {mode === "select" && (
          <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6 items-start">
            {/* Sidebar - Meu Time */}
            <aside className="lg:col-span-1 space-y-6">
              {hasTeam && myTeam && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Meu Time
                  </h2>
                  {renderTeamCard(myTeam, true)}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Você já está neste time nesta edição. Para trocar, saia do time atual primeiro.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {pastTeams.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    Eventos anteriores
                  </h2>
                  <div className="space-y-3">
                    {pastTeams.map((time) => (
                      <div key={`past-${time.id}`}>
                        {renderTeamCard(time, false)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Conteúdo principal */}
            <section className="lg:col-span-3 space-y-8">
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

              {/* Lista de Times Cadastrados */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Users className="w-6 h-6" />
                    {hasTeam ? "Outros Times" : "Times Cadastrados"}
                  </CardTitle>
                  <CardDescription>
                    Times do evento atual. O filtro começa na sua sede, mas você pode ver as outras.
                  </CardDescription>
                  <div className="pt-3">
                    <Select value={sedeFiltro} onValueChange={setSedeFiltro}>
                      <SelectTrigger className="w-full sm:w-[320px]">
                        <SelectValue placeholder="Filtrar por sede" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas as sedes</SelectItem>
                        {sedes.map((sede) => (
                          <SelectItem key={sede.id} value={String(sede.id)}>
                            {sede.nome_campus} — {sede.cidade}/{sede.uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  {filteredTeams.filter((t) => t.id !== myTeam?.id).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time cadastrado ainda"}
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredTeams.filter((t) => t.id !== myTeam?.id).map((time) => (
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
            </section>
          </div>
        )}
      </main>
    </div>
  );
}