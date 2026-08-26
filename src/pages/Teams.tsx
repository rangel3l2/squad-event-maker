import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, PlusCircle, Search, History, UserX, UserPlus } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import {
  listarUsuarios,
  listarTimes,
  listarTimesComIntegrantes,
  listarTimesIncompletos,
  listarUsuariosSemTime,
  listarSedesPorEvento,
  mostrarTime,
  mostrarTimeUsuario,
  EVENTO_ATUAL,
  isEdicaoAtual,
  labelNivel,
  labelPeriodo,
  type Sede,
  type Time,
  type Usuario,
} from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventSwitcher } from "@/components/EventSwitcher";

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
  
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [sedeFiltro, setSedeFiltro] = useState<string>("todas");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"cadastrados" | "incompletos" | "sem-time">("cadastrados");
  const [incompleteTeams, setIncompleteTeams] = useState<Time[]>([]);
  const [usersWithoutTeam, setUsersWithoutTeam] = useState<Usuario[]>([]);
  const [tabLoading, setTabLoading] = useState(false);
  // Edições anteriores são somente leitura: não é possível criar ou entrar em times.
  const edicaoAtual = isEdicaoAtual();

  useEffect(() => {
    if (!edicaoAtual && mode !== "select") setMode("select");
  }, [edicaoAtual, mode]);

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
        setUsuarios(usuarios);
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          navigate("/complete-profile");
          return;
        }

        console.log("=== VERIFICANDO SE USUÁRIO JÁ ESTÁ EM UM TIME DESTE EVENTO ===");
        console.log("ID do usuário:", usuario.id, "Evento atual:", EVENTO_ATUAL);

        // A rota específica do usuário é a fonte principal para o time atual.
        // A listagem geral nem sempre inclui os integrantes e não deve decidir
        // sozinha se o usuário pertence ou não a um time.
        let currentTeam: Time | null = null;
        const previousTeams: Time[] = [];
        const meuId = Number(usuario.id);

        try {
          const timeAtual = await mostrarTimeUsuario(meuId, EVENTO_ATUAL);
          if (timeAtual?.id != null) currentTeam = timeAtual;
        } catch (error) {
          console.info("Usuário sem time retornado pela rota específica neste evento", error);
        }

        // Todos os times de todos os eventos
        let todosOsTimes: Time[] = [];
        try {
          todosOsTimes = await listarTimes({ evento: null });
        } catch (e) {
          console.error("Erro ao listar times (todos eventos):", e);
        }
        if (todosOsTimes.length === 0) {
          try {
            todosOsTimes = await listarTimes({ evento: EVENTO_ATUAL });
          } catch {
            /* ignore */
          }
        }

        // O evento atual já vem completo (times + integrantes) numa requisição só.
        try {
          const atuaisCompletos = await listarTimesComIntegrantes({ evento: EVENTO_ATUAL });
          const mapaAtual = new Map<number, any[]>();
          atuaisCompletos.forEach((t) => {
            if (t.id != null) mapaAtual.set(Number(t.id), (t.integrantes || []) as any[]);
          });
          todosOsTimes = todosOsTimes.map((t) =>
            t.id != null && mapaAtual.has(Number(t.id))
              ? { ...t, integrantes: mapaAtual.get(Number(t.id)) as any }
              : t
          );
        } catch {
          /* ignore */
        }

        // Edições anteriores: só buscamos detalhes dos poucos times que ainda
        // não têm integrantes e que não são meus por posse.
        const semIntegrantes = todosOsTimes.filter(
          (t) =>
            t.id != null &&
            Number(t.evento) !== Number(EVENTO_ATUAL) &&
            !(Array.isArray(t.integrantes) && t.integrantes.length > 0)
        );
        if (semIntegrantes.length > 0) {
          const detalhes = await Promise.all(
            semIntegrantes.slice(0, 10).map(async (t) => {
              try {
                const det = await mostrarTime(t.id as number);
                return { id: t.id, integrantes: ((det as any)?.integrantes ?? []) as any[] };
              } catch {
                return null;
              }
            })
          );
          const mapa = new Map<number, any[]>();
          detalhes.forEach((d) => d && mapa.set(d.id as number, d.integrantes));
          todosOsTimes = todosOsTimes.map((t) =>
            t.id != null && mapa.has(t.id) ? { ...t, integrantes: mapa.get(t.id) as any } : t
          );
        }


        for (const time of todosOsTimes) {
          if (time.id == null) continue;
          const ehDono = Number(time.dono_id) === meuId;
          const ehIntegrante = (time.integrantes || []).some((integrante: any) =>
            Number(integrante.usuario_id ?? integrante.usuario?.id ?? integrante.id) === meuId
          );
          if (!ehDono && !ehIntegrante) continue;

           if (Number(time.evento) === Number(EVENTO_ATUAL)) {
            if (!currentTeam) currentTeam = time;
          } else if (!previousTeams.some((t) => t.id === time.id)) {
            previousTeams.push(time);
          }
        }

        console.log("Meus times encontrados:", { currentTeam, previousTeams });

        if (currentTeam) {
          setHasTeam(true);
          setCurrentTeamName(currentTeam.nome_time || "");
          setMyTeam(currentTeam);
        } else {
          setHasTeam(false);
          setMyTeam(null);
        }


        setPastTeams(previousTeams);
      } catch (error) {
        console.error("Error checking profile:", error);
      } finally {
        setProfileLoading(false);
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
        // Uma requisição só: times + integrantes.
        const times = await listarTimesComIntegrantes({
          evento: EVENTO_ATUAL,
          sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
        });
        setAllTeams(times);
      } catch (error) {
        console.error("Erro ao carregar times:", error);
      }
    };

    loadTeams();
  }, [refreshKey, sedeFiltro]); // Recarrega quando refreshKey ou sede mudar

  // Carregar dados das abas complementares (times incompletos e jogadores sem time)
  useEffect(() => {
    const loadTabData = async () => {
      setTabLoading(true);
      try {
        const [incompletos, semTime, completos] = await Promise.all([
          listarTimesIncompletos({
            evento: EVENTO_ATUAL,
            sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
          }),
          listarUsuariosSemTime({
            evento: EVENTO_ATUAL,
            sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
          }),
          listarTimesComIntegrantes({
            evento: EVENTO_ATUAL,
            sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
          }).catch(() => [] as Time[]),
        ]);

        // Reaproveita os integrantes já carregados pela rota agregada
        const mapa = new Map<number, any[]>();
        completos.forEach((t) => {
          if (t.id != null) mapa.set(Number(t.id), (t.integrantes || []) as any[]);
        });
        setIncompleteTeams(
          incompletos.map((t) =>
            t.id != null && mapa.has(Number(t.id)) && !(t.integrantes?.length)
              ? { ...t, integrantes: mapa.get(Number(t.id)) as any }
              : t
          )
        );

        setUsersWithoutTeam(semTime);
      } catch (error) {
        console.error("Erro ao carregar dados das abas:", error);
      } finally {
        setTabLoading(false);
      }
    };

    loadTabData();
  }, [refreshKey, sedeFiltro]);


  const getMembrosDoTime = (time: Time) => {
    const integrantes = Array.isArray(time.integrantes) ? time.integrantes : [];
    const ids = integrantes.map((i: any) => i.usuario_id ?? i.id);
    // Garante que o dono apareça mesmo que a API não o liste como integrante
    if (time.dono_id != null && !ids.includes(time.dono_id)) ids.unshift(time.dono_id);
    return ids
      .map((id) => usuarios.find((u) => u.id === id))
      .filter((u): u is Usuario => !!u);
  };

  const renderTeamCard = (time: Time, isCurrent: boolean, compact = false) => {
    const cor = time.cor_time || time.cor_base || "hsl(var(--primary))";
    const membros = getMembrosDoTime(time);
    const totalMembros = time.qtd_integrantes ?? time.quantidade ?? membros.length ?? 0;

    return (
      <Card
        className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] ${isCurrent ? "ring-2 ring-primary/40" : ""}`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${cor}15 0%, transparent 55%)`,
          borderColor: `${cor}40`,
        }}
        onClick={() => time.id != null && navigate(`/team-details/${time.id}`)}
      >
        <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />
        <CardContent className={`flex items-center gap-3 ${compact ? "py-3 px-3" : "py-5 px-4"}`}>
          {time.imagem_time ? (
            <div className="relative flex-shrink-0">
              <div
                className="absolute inset-0 rounded-lg blur-sm opacity-40"
                style={{ backgroundColor: cor }}
              />
              <img
                src={time.imagem_time}
                alt={`Bandeira ${time.nome_time}`}
                className={`relative object-contain rounded-lg flex-shrink-0 bg-card/80 border border-white/10 ${compact ? "w-10 h-10" : "w-14 h-14"}`}
              />
            </div>
          ) : (
            <div
              className={`flex-shrink-0 rounded-lg flex items-center justify-center bg-muted ${compact ? "w-10 h-10" : "w-14 h-14"}`}
            >
              <Users className={`text-muted-foreground ${compact ? "w-5 h-5" : "w-7 h-7"}`} />
            </div>
          )}

          <div className="flex-1 min-w-0 text-left">
            <p className={`font-bold truncate ${compact ? "text-sm" : "text-base"}`}>{time.nome_time}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {totalMembros}/4
            </p>
            {!isCurrent && time.evento != null && (
              <p className="text-xs text-muted-foreground">Edição {time.evento}</p>
            )}
          </div>

          <div className="flex flex-nowrap -space-x-1.5 overflow-hidden pl-1">
            {membros.slice(0, 4).map((m, idx) => (
              <Avatar
                key={idx}
                className={`inline-block ring-2 ring-background ${compact ? "w-5 h-5" : "w-6 h-6"}`}
              >
                <AvatarImage src={m.url_image_perfil} alt="" />
                <AvatarFallback className="text-[7px] bg-muted">
                  {m.nome?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {membros.length > 4 && (
              <div
                className={`flex items-center justify-center rounded-full bg-muted ring-2 ring-background text-[7px] font-medium ${compact ? "w-5 h-5" : "w-6 h-6"}`}
              >
                +{membros.length - 4}
              </div>
            )}
            {membros.length === 0 && totalMembros > 0 && (
              <span className="text-[10px] text-muted-foreground">{totalMembros} membro(s)</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderUserCard = (usuario: Usuario) => {
    return (
      <Card className="overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]">
        <CardContent className="flex items-center gap-3 py-5 px-4">
          <Avatar className="w-14 h-14 ring-2 ring-background">
            <AvatarImage src={usuario.url_image_perfil} alt={usuario.nome} />
            <AvatarFallback className="text-lg bg-muted">
              {usuario.nome?.charAt(0).toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="font-bold truncate text-base">{usuario.nome}</p>
            <p className="text-xs text-muted-foreground">
              {labelNivel(usuario.nivel)} • {labelPeriodo(usuario.periodo)}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  const sortedAllTeams = [...allTeams].sort((a, b) =>
    a.nome_time.localeCompare(b.nome_time, "pt-BR", { ignorePunctuation: true })
  );
  const sortedIncompleteTeams = [...incompleteTeams].sort((a, b) =>
    a.nome_time.localeCompare(b.nome_time, "pt-BR", { ignorePunctuation: true })
  );
  const sortedUsersWithoutTeam = [...usersWithoutTeam].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { ignorePunctuation: true })
  );

  const filteredAllTeams = sortedAllTeams.filter((time) =>
    searchTerm ? time.nome_time.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );
  const filteredIncompleteTeams = sortedIncompleteTeams.filter((time) =>
    searchTerm ? time.nome_time.toLowerCase().includes(searchTerm.toLowerCase()) : true
  );
  const filteredUsersWithoutTeam = sortedUsersWithoutTeam.filter((u) =>
    searchTerm ? u.nome.toLowerCase().includes(searchTerm.toLowerCase()) : true
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
              {profileLoading && (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                </div>
              )}

              {!profileLoading && hasTeam && myTeam && (
                <div className="space-y-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Meu Time
                  </h2>
                  {renderTeamCard(myTeam, true, true)}
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
                        {renderTeamCard(time, false, true)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Conteúdo principal */}
            <section className="lg:col-span-3 space-y-8">
              {!profileLoading && !hasTeam && edicaoAtual && (
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

              {/* Seletor de edição (evento) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
                <span className="text-xs text-muted-foreground">
                  Mostrando dados da edição:
                </span>
                <EventSwitcher />
              </div>

              {!edicaoAtual && (
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                  Você está vendo uma <strong className="text-foreground">edição anterior</strong> da
                  Copa. Este histórico é somente leitura: não é possível criar times nem entrar em
                  times de edições passadas.
                </div>
              )}

              {/* Abas de categorias */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-auto p-1.5 bg-muted/50 rounded-2xl">
                  <TabsTrigger
                    value="cadastrados"
                    className="py-4 text-sm md:text-base font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md rounded-xl gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Times Cadastrados
                  </TabsTrigger>
                  <TabsTrigger
                    value="incompletos"
                    className="py-4 text-sm md:text-base font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md rounded-xl gap-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    Times Incompletos
                  </TabsTrigger>
                  <TabsTrigger
                    value="sem-time"
                    className="py-4 text-sm md:text-base font-semibold data-[state=active]:bg-background data-[state=active]:shadow-md rounded-xl gap-2"
                  >
                    <UserX className="w-5 h-5" />
                    Jogadores sem Time
                  </TabsTrigger>
                </TabsList>

                <div className="mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            {activeTab === "cadastrados" && <><Users className="w-6 h-6" /> Times Cadastrados</>}
                            {activeTab === "incompletos" && <><UserPlus className="w-6 h-6" /> Times Incompletos</>}
                            {activeTab === "sem-time" && <><UserX className="w-6 h-6" /> Jogadores sem Time</>}
                          </CardTitle>
                          <CardDescription>
                            {activeTab === "cadastrados" && "Todos os times do evento atual em ordem alfabética."}
                            {activeTab === "incompletos" && "Times que ainda não completaram o número de integrantes."}
                            {activeTab === "sem-time" && "Participantes que ainda não entraram em nenhum time."}
                          </CardDescription>
                        </div>
                        <div className="pt-2">
                          <Select value={sedeFiltro} onValueChange={setSedeFiltro}>
                            <SelectTrigger className="w-full sm:w-[260px]">
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
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Campo de busca */}
                      <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <Input
                          type="text"
                          placeholder={
                            activeTab === "sem-time"
                              ? "Buscar jogador pelo nome..."
                              : "Buscar time pelo nome..."
                          }
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>

                      {profileLoading || tabLoading ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-28 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : (
                        <>
                          <TabsContent value="cadastrados" className="mt-0">
                            {filteredAllTeams.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time cadastrado ainda"}
                              </p>
                            ) : (
                              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredAllTeams.map((time) => (
                                  <div key={time.id}>
                                    {renderTeamCard(time, time.id === myTeam?.id, false)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="incompletos" className="mt-0">
                            {filteredIncompleteTeams.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time incompleto no momento"}
                              </p>
                            ) : (
                              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredIncompleteTeams.map((time) => (
                                  <div key={time.id}>
                                    {renderTeamCard(time, time.id === myTeam?.id, false)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="sem-time" className="mt-0">
                            {filteredUsersWithoutTeam.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                {searchTerm ? "Nenhum jogador encontrado com esse nome" : "Todos os jogadores já estão em times"}
                              </p>
                            ) : (
                              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredUsersWithoutTeam.map((usuario) => (
                                  <div key={usuario.id}>
                                    {renderUserCard(usuario)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </Tabs>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}