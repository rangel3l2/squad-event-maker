import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, PlusCircle, Search, History } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios, listarTimes, listarSedesPorEvento, mostrarTime, mostrarTimeUsuario, EVENTO_ATUAL, type Sede, type Time, type Usuario } from "@/services/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [profileLoading, setProfileLoading] = useState(true);

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

        // A listagem nem sempre retorna os integrantes: buscar detalhes quando faltar
        const semIntegrantes = todosOsTimes.filter(
          (t) => t.id != null && !(Array.isArray(t.integrantes) && t.integrantes.length > 0)
        );
        if (semIntegrantes.length > 0) {
          const detalhes = await Promise.all(
            semIntegrantes.slice(0, 40).map(async (t) => {
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
        const times = await listarTimes({
          evento: EVENTO_ATUAL,
          sede_id: sedeFiltro === "todas" ? null : Number(sedeFiltro),
        });
        setAllTeams(times);
        setFilteredTeams(times);

        // Alguns endpoints de listagem não retornam os integrantes.
        // Enriquecemos os times sem integrantes para exibir os avatares nos cards.
        const faltando = times.filter(
          (t) => t.id != null && !(Array.isArray(t.integrantes) && t.integrantes.length > 0)
        );
        if (faltando.length > 0) {
          const detalhes = await Promise.all(
            faltando.slice(0, 30).map(async (t) => {
              try {
                const det = await mostrarTime(t.id as number);
                return { id: t.id, integrantes: (det as any)?.integrantes ?? [] };
              } catch {
                return null;
              }
            })
          );
          const mapa = new Map<number, any[]>();
          detalhes.forEach((d) => d && mapa.set(d.id as number, d.integrantes));
          if (mapa.size > 0) {
            const merge = (lista: Time[]) =>
              lista.map((t) =>
                t.id != null && mapa.has(t.id)
                  ? { ...t, integrantes: mapa.get(t.id) as any }
                  : t
              );
            setAllTeams((prev) => merge(prev));
            setFilteredTeams((prev) => merge(prev));
          }
        }
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
                  {profileLoading ? (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : filteredTeams.filter((t) => t.id !== myTeam?.id).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {searchTerm ? "Nenhum time encontrado com esse nome" : "Nenhum time cadastrado ainda"}
                    </p>
                  ) : (
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredTeams.filter((t) => t.id !== myTeam?.id).map((time) => (
                        <div key={time.id}>
                          {renderTeamCard(time, false, false)}
                        </div>
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