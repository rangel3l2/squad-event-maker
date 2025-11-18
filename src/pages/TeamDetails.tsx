import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, KeyRound, Sparkles, UserCog, Trash2, Trophy, FileCode, FileText, Award, Image, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { listarUsuarios, mostrarTimeUsuario, mostrarTime, sairDoTime, transferirDono, deletarTime, adicionarIntegrante, listarTimes, buscarDinamicasTime, buscarImagensDinamica, buscarGifDinamica, buscarTodasSubmissoesDinamica, type Usuario, type Time, type Dinamica, type ArquivoDinamica, type SubmissaoDinamica } from "@/services/api";
import CodeViewer from "@/components/CodeViewer";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function TeamDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [time, setTime] = useState<Time | null>(null);
  const [integrantes, setIntegrantes] = useState<Usuario[]>([]);
  const [integrantesComFuncao, setIntegrantesComFuncao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUserInTeam, setIsUserInTeam] = useState(false);
  const [userHasTeam, setUserHasTeam] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [selectedNewLeader, setSelectedNewLeader] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dinamicas, setDinamicas] = useState<Dinamica[]>([]);
  const [selectedDinamica, setSelectedDinamica] = useState<Dinamica | null>(null);
  const [submissoes, setSubmissoes] = useState<SubmissaoDinamica[]>([]);
  const [selectedSubmissao, setSelectedSubmissao] = useState<SubmissaoDinamica | null>(null);
  const [loadingSubmissoes, setLoadingSubmissoes] = useState(false);
  const [dinamicaAtual, setDinamicaAtual] = useState<any>(null);

  useEffect(() => {
    const loadTeamData = async () => {
      // Se não há teamId na URL e não está logado, redireciona
      if (!user && !teamId) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }

      try {
        let usuario: Usuario | undefined;
        
        // Buscar dados do usuário apenas se estiver logado
        if (user) {
          const usuarios = await listarUsuarios();
          usuario = usuarios.find(u => u.email === user.email);

          if (!usuario && !teamId) {
            toast.error("Complete seu perfil primeiro");
            navigate("/complete-profile");
            return;
          }

          // Verificar se o usuário já tem um time (apenas se logado)
          if (usuario) {
            let usuarioTemTime = false;
            
            // Verificar se é dono de algum time
            try {
              const userTeam = await mostrarTimeUsuario(usuario.id!);
              if (userTeam && userTeam.id != null) {
                usuarioTemTime = true;
              }
            } catch {
              // Não é dono de nenhum time
            }

            // Verificar se é integrante de algum time
            if (!usuarioTemTime) {
              const times = await listarTimes();
              for (const time of times) {
                const integrantes = time.integrantes || [];
                const ehIntegrante = integrantes.some(
                  (integrante: any) => integrante.usuario_id === usuario.id
                );
                
                if (ehIntegrante) {
                  usuarioTemTime = true;
                  break;
                }
              }
            }
            
            setUserHasTeam(usuarioTemTime);
          }
        }

        let timeData: Time;
        
        // Se tem teamId na URL, busca esse time específico (pode ser visualização pública)
        if (teamId) {
          try {
            timeData = await mostrarTime(Number(teamId));
          } catch (error) {
            console.error("Erro ao buscar time por ID:", error);
            toast.error("Erro ao carregar dados do time");
            setLoading(false);
            return;
          }
        } else if (usuario) {
          // Senão, busca o time do usuário logado
          try {
            timeData = await mostrarTimeUsuario(usuario.id!);
          } catch (error) {
            console.error("Erro ao buscar time do usuário:", error);
            toast.error("Você não está em nenhum time");
            setLoading(false);
            return;
          }
        } else {
          // Não tem teamId e não está logado
          toast.error("Você precisa estar logado");
          navigate("/auth");
          return;
        }
        setTime(timeData);

        // Determinar contagem de integrantes (API pode retornar em campos diferentes)
        const countApi = Number(
          (timeData as any).qtd_integrantes ?? (timeData as any).quantidade ?? (timeData.integrantes?.length || 0)
        ) || 0;

        // Preparar lista de integrantes com fallback para buscar detalhes se necessário
        let integrantesLista: any[] = Array.isArray(timeData.integrantes) ? timeData.integrantes : [];

        if (integrantesLista.length === 0 && countApi > 0 && timeData.id) {
          console.log("Integrantes vazio, mas contagem > 0. Buscando detalhes do time por ID...");
          try {
            const detalhe = await mostrarTime(timeData.id);
            integrantesLista = Array.isArray(detalhe.integrantes) ? detalhe.integrantes : [];
            console.log("Integrantes obtidos via fallback:", integrantesLista);
          } catch (e) {
            console.warn("Falha ao buscar detalhes do time:", e);
          }
        }
        
        if (integrantesLista.length > 0) {
          setIntegrantesComFuncao(integrantesLista);

          const integrantesIds = integrantesLista.map((i: any) => i.usuario_id ?? i.id);
          console.log("IDs dos integrantes:", integrantesIds);

          // Buscar dados dos usuários apenas se tivermos a lista completa
          const usuarios = await listarUsuarios();
          const integrantesData = usuarios.filter(u => integrantesIds.includes(u.id));
          console.log("Dados dos integrantes encontrados:", integrantesData);

          setIntegrantes(integrantesData);

          // Verificar se o usuário logado está neste time (apenas se logado)
          if (usuario && teamId) {
            const usuarioEstaNoTime = integrantesIds.includes(usuario.id);
            setIsUserInTeam(usuarioEstaNoTime);
            console.log("Usuário está neste time?", usuarioEstaNoTime);
            
            // Check if user is leader based on dono_id
            setIsLeader(timeData.dono_id === usuario.id);
          } else if (usuario && !teamId) {
            // Quando é o time do usuário, já sabemos que ele pertence ao time
            setIsUserInTeam(true);
            
            // Check if user is leader based on dono_id
            setIsLeader(timeData.dono_id === usuario.id);
          }
        } else {
          setIntegrantes([]);
          setIntegrantesComFuncao([]);
          // Se estivermos na visualização do próprio time, mantém true
          setIsUserInTeam(!teamId);
        }

        // Buscar dinâmicas do time
        const timeIdParaDinamicas = timeData.id || (teamId ? parseInt(teamId) : null);
        
        if (timeIdParaDinamicas) {
          try {
            const dinamicasData = await buscarDinamicasTime(timeIdParaDinamicas);
            setDinamicas(dinamicasData.dinamicas || []);
          } catch (error) {
            console.error("Erro ao carregar dinâmicas:", error);
            setDinamicas([]);
          }
        }
      } catch (error: any) {
        console.error("Erro ao carregar dados do time:", error);
        toast.error("Erro ao carregar dados do time: " + (error.message || "Erro desconhecido"));
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user, navigate, teamId]);

  const handleLeaveTeam = async () => {
    if (!user || !time) return;

    try {
      setIsLeaving(true);
      
      // Buscar usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario?.id) {
        toast.error("Usuário não encontrado");
        return;
      }
      
      const resultado = await sairDoTime(time.id!, usuario.id);
      
      toast.success(resultado.message);
      navigate("/teams");
    } catch (error: any) {
      console.error("Erro ao sair do time:", error);
      toast.error("Erro ao sair do time: " + error.message);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleTransferLeadership = async () => {
    if (!user || !time || !selectedNewLeader) return;

    try {
      setIsTransferring(true);
      
      const novoLiderId = parseInt(selectedNewLeader);
      
      await transferirDono(time.id!, novoLiderId);
      
      toast.success("Liderança transferida com sucesso!");
      setShowTransferDialog(false);
      setSelectedNewLeader("");
      
      // Recarregar dados do time
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao transferir liderança:", error);
      toast.error("Erro ao transferir liderança: " + error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!time) return;

    try {
      setIsDeleting(true);
      
      await deletarTime(time.id!);
      
      toast.success("Time deletado com sucesso!");
      navigate("/teams");
    } catch (error: any) {
      console.error("Erro ao deletar time:", error);
      toast.error("Erro ao deletar time: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleJoinTeam = async () => {
    if (!user || !time) return;

    if (!inviteCode.trim()) {
      toast.error("Digite o código de convite");
      return;
    }

    setIsJoining(true);

    try {
      // Buscar usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario) {
        toast.error("Você precisa completar seu cadastro primeiro para entrar em um time");
        navigate("/complete-profile");
        return;
      }

      // Verificar se já tem time
      console.log("=== VERIFICANDO SE USUÁRIO JÁ TEM TIME ===");
      console.log("Usuario ID:", usuario.id);
      
      try {
        const userTeam = await mostrarTimeUsuario(usuario.id!);
        console.log("Resultado mostrarTimeUsuario:", userTeam);
        console.log("userTeam.id:", userTeam?.id);
        console.log("userTeam.nome_time:", userTeam?.nome_time);
        
        if (userTeam && userTeam.id != null) {
          console.log("Usuário JÁ TEM TIME:", userTeam.nome_time);
          toast.error(`Você já está no time "${userTeam.nome_time}". Saia desse time primeiro para entrar em outro.`);
          return;
        }
      } catch (error) {
        console.log("Erro ao buscar time do usuário (pode ser normal se não tiver time):", error);
      }

      // Verificar também se é integrante de algum time
      console.log("=== VERIFICANDO SE É INTEGRANTE DE ALGUM TIME ===");
      const todosOsTimes = await listarTimes();
      console.log("Total de times para verificar:", todosOsTimes.length);
      
      for (const timeVerificar of todosOsTimes) {
        const integrantes = timeVerificar.integrantes || [];
        const ehIntegrante = integrantes.some(
          (integrante: any) => integrante.usuario_id === usuario.id
        );
        
        if (ehIntegrante) {
          console.log("Usuário É INTEGRANTE do time:", timeVerificar.nome_time);
          toast.error(`Você já está no time "${timeVerificar.nome_time}". Saia desse time primeiro para entrar em outro.`);
          return;
        }
      }
      
      console.log("Usuário NÃO está em nenhum time. Pode continuar.");

      // Verificar código de convite
      if (!time.senha_convite) {
        toast.error("Este time não possui um código de convite configurado");
        return;
      }
      
      if (time.senha_convite !== inviteCode.trim()) {
        toast.error(`Código incorreto para o time "${time.nome_time}". Verifique o código e tente novamente.`);
        return;
      }

      // Verificar limite de integrantes
      const integrantesCount = time.integrantes?.length || 0;
      if (integrantesCount >= 4) {
        toast.error("Este time já atingiu o limite máximo de 4 membros");
        return;
      }

      // Adicionar ao time
      await adicionarIntegrante(time.id!, {
        usuario_id: usuario.id!,
        funcao: "Membro",
      });

      toast.success(`Você entrou no time "${time.nome_time}" com sucesso!`);
      
      // Recarregar página para atualizar status
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao entrar no time:", error);
      toast.error("Erro ao entrar no time: " + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleDinamicaClick = async (dinamica: Dinamica) => {
    setSelectedDinamica(dinamica);
    setLoadingSubmissoes(true);
    
    // Buscar todas as submissões dos integrantes para esta dinâmica
    if (dinamica.code_pasta && time) {
      try {
        const integrantesComId = integrantesComFuncao
          .map(i => ({ id: i.id, nome: i.nome }))
          .filter((i): i is { id: number; nome: string } => i.id != null);
        
        const submissoesData = await buscarTodasSubmissoesDinamica(
          dinamica,
          dinamicas,
          integrantesComId
        );
        setSubmissoes(submissoesData);
        
        // Selecionar a primeira submissão por padrão
        if (submissoesData.length > 0) {
          setSelectedSubmissao(submissoesData[0]);
        }
      } catch (error) {
        console.error("Erro ao buscar submissões:", error);
        setSubmissoes([]);
      } finally {
        setLoadingSubmissoes(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!time) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">Você não está em nenhum time</p>
          <Button onClick={() => navigate("/teams")}>
            Voltar para Times
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/teams")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Logo e Nome do Time */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4">
              {time.imagem_time && (
                <img
                  src={time.imagem_time}
                  alt={`Logo ${time.nome_time}`}
                  className="w-48 h-48 object-contain rounded-lg"
                />
              )}
              <CardTitle className="text-3xl">{time.nome_time}</CardTitle>
              
              <div className="flex gap-2">
                {isUserInTeam && isLeader && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(`/logo-editor/${teamId || time.id}`)}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Editar Logo
                    </Button>
                    
                    <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <UserCog className="w-4 h-4 mr-2" />
                          Transferir Liderança
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Transferir Liderança</DialogTitle>
                          <DialogDescription>
                            Escolha um membro do time para se tornar o novo líder
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Select value={selectedNewLeader} onValueChange={setSelectedNewLeader}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o novo líder" />
                            </SelectTrigger>
                            <SelectContent>
                              {integrantesComFuncao
                                .filter((i: any) => {
                                  const membroId = i.usuario_id ?? i.id;
                                  return membroId !== time.dono_id;
                                })
                                .map((integrante: any) => {
                                  const membroId = integrante.usuario_id ?? integrante.id;
                                  const membro = integrantes.find(u => u.id === membroId);
                                  return (
                                    <SelectItem key={membroId} value={String(membroId)}>
                                      {membro?.nome || "Membro sem nome"}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowTransferDialog(false);
                              setSelectedNewLeader("");
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleTransferLeadership}
                            disabled={!selectedNewLeader || isTransferring}
                          >
                            {isTransferring ? "Transferindo..." : "Confirmar Transferência"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar Time
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Deletar Time</DialogTitle>
                          <DialogDescription>
                            Tem certeza que deseja deletar o time "{time.nome_time}"? Esta ação não pode ser desfeita.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setShowDeleteDialog(false)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={handleDeleteTeam}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Deletando..." : "Deletar Time"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
                
                {isUserInTeam && !isLeader && (
                  <Button 
                    variant="destructive" 
                    onClick={handleLeaveTeam}
                    disabled={isLeaving}
                  >
                    {isLeaving ? "Saindo..." : "Sair do Time"}
                  </Button>
                )}
              </div>

              {!isUserInTeam && teamId && !userHasTeam && (
                <div className="w-full max-w-md space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <KeyRound className="w-4 h-4" />
                    <span>Digite o código para entrar neste time</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código de convite"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="font-mono text-center"
                      disabled={isJoining}
                    />
                    <Button 
                      onClick={handleJoinTeam}
                      disabled={isJoining || !inviteCode.trim()}
                    >
                      {isJoining ? "Entrando..." : "Entrar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Integrantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Integrantes ({time.qtd_integrantes || time.quantidade || integrantes.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrantes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum integrante ainda
                </p>
              ) : (
                integrantes.map((integrante) => {
                  const isOwner = time.dono_id === integrante.id;
                  
                  return (
                    <div
                      key={integrante.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={integrante.url_image_perfil || undefined} />
                        <AvatarFallback>
                          {integrante.nome.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{integrante.nome}</p>
                          {isOwner && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              Líder
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Turma {integrante.turma} - Período {integrante.periodo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dinâmicas/Jogos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Dinâmicas Participadas ({dinamicas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dinamicas.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma dinâmica participada ainda
                </p>
              ) : (
                dinamicas.map((dinamica, index) => (
                  <div
                    key={index}
                    onClick={() => handleDinamicaClick(dinamica)}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-semibold text-lg">{dinamica.evento.toUpperCase()}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          dinamica.status 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                          {dinamica.status ? 'Ativa' : 'Finalizada'}
                        </span>
                      </div>
                      
                      {dinamica.configuracao && (
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p><strong>Nome:</strong> {dinamica.configuracao.nome.join(', ')}</p>
                          <p><strong>Descrição:</strong> {dinamica.configuracao.descr}</p>
                          <p className="text-xs mt-2"><strong>Código:</strong> {dinamica.code_pasta}</p>
                        </div>
                      )}
                      
                      {!dinamica.configuracao && (
                        <p className="text-sm text-muted-foreground">
                          Código: {dinamica.code_pasta}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog para exibir conteúdo da dinâmica */}
        <Dialog open={selectedDinamica !== null} onOpenChange={() => {
          setSelectedDinamica(null);
          setSubmissoes([]);
          setSelectedSubmissao(null);
        }}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {selectedDinamica?.evento.toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                Submissões de todos os integrantes
              </DialogDescription>
            </DialogHeader>
            
            {/* Seletor de integrante */}
            {loadingSubmissoes ? (
              <div className="py-4 text-center text-muted-foreground">
                Carregando submissões...
              </div>
            ) : submissoes.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <Select 
                    value={selectedSubmissao?.integranteId.toString()}
                    onValueChange={(value) => {
                      const submissao = submissoes.find(s => s.integranteId.toString() === value);
                      setSelectedSubmissao(submissao || null);
                    }}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Selecione um integrante" />
                    </SelectTrigger>
                    <SelectContent>
                      {submissoes.map((submissao) => (
                        <SelectItem 
                          key={submissao.integranteId} 
                          value={submissao.integranteId.toString()}
                        >
                          {submissao.integranteNome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-muted-foreground">
                Nenhuma submissão encontrada
              </div>
            )}
            
            {selectedSubmissao && (
              <Tabs defaultValue="html" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="html">
                    <FileCode className="w-4 h-4 mr-2" />
                    HTML
                  </TabsTrigger>
                  <TabsTrigger value="css">
                    <FileText className="w-4 h-4 mr-2" />
                    CSS
                  </TabsTrigger>
                  <TabsTrigger value="pontuacao">
                    <Award className="w-4 h-4 mr-2" />
                    Pontuação
                  </TabsTrigger>
                  <TabsTrigger value="resultado">
                    <Image className="w-4 h-4 mr-2" />
                    Resultado
                  </TabsTrigger>
                  <TabsTrigger value="correcao" disabled={!selectedSubmissao.correcao || selectedSubmissao.correcao.length === 0}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Correção
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="html" className="space-y-4">
                  {selectedSubmissao.html && (
                    <CodeViewer url={selectedSubmissao.html} type="html" title="Código HTML" />
                  )}
                </TabsContent>

                <TabsContent value="css" className="space-y-4">
                  {selectedSubmissao.css && (
                    <CodeViewer url={selectedSubmissao.css} type="css" title="Código CSS" />
                  )}
                </TabsContent>

                <TabsContent value="pontuacao" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pontuação Detalhada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
                        {selectedSubmissao.pontuacao}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resultado" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resultado Final</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {selectedSubmissao.imagem_desenvolvimento && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                            Desenvolvimento (atualiza a cada minuto)
                          </h4>
                          <div className="flex justify-center">
                            <img 
                              key={selectedSubmissao.imagem_desenvolvimento}
                              src={selectedSubmissao.imagem_desenvolvimento} 
                              alt="Em Desenvolvimento" 
                              className="max-w-full h-auto rounded-lg border"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Imagem Pronta</h4>
                        <div className="flex justify-center">
                          <img 
                            src={selectedSubmissao.imagem_pronta} 
                            alt="Resultado Final" 
                            className="max-w-full h-auto rounded-lg border"
                          />
                        </div>
                      </div>
                      
                      {selectedSubmissao.correcao_completa && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Correção Completa</h4>
                          <div className="flex justify-center">
                            <img 
                              src={selectedSubmissao.correcao_completa} 
                              alt="Correção Completa" 
                              className="max-w-full h-auto rounded-lg border"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="correcao" className="space-y-4">
                  {selectedSubmissao.correcao && selectedSubmissao.correcao.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Imagens de Correção ({selectedSubmissao.correcao.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Carousel className="w-full max-w-4xl mx-auto">
                          <CarouselContent>
                            {selectedSubmissao.correcao.map((url, index) => (
                              <CarouselItem key={index}>
                                <div className="flex justify-center p-4">
                                  <img 
                                    src={url} 
                                    alt={`Correção ${index + 1}`} 
                                    className="max-w-full h-auto rounded-lg border"
                                  />
                                </div>
                                <p className="text-center text-sm text-muted-foreground mt-2">
                                  Imagem {index + 1} de {selectedSubmissao.correcao.length}
                                </p>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          <CarouselPrevious />
                          <CarouselNext />
                        </Carousel>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
