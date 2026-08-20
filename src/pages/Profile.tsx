import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarSelector } from "@/components/teams/AvatarSelector";
import { SedeSelector } from "@/components/teams/SedeSelector";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { AlertCircle, Users, LogOut, Edit, Trash2, Trophy, History, Copy } from "lucide-react";
import { listarUsuarios, alterarUsuario, sairDoTime, deletarTime, deletarUsuario, listarTimes, EVENTO_ATUAL, NIVEIS_ENSINO, PERIODOS, type Time } from "@/services/api";

const currentYear = new Date().getFullYear();

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  nivel: z.string().min(1, "Selecione o nível de ensino"),
  periodo: z.string().min(1, "Selecione o período"),
  anoIngresso: z.string().min(1, "Informe o ano de ingresso").refine(
    (v) => {
      const year = parseInt(v);
      return !isNaN(year) && year >= 2000 && year <= currentYear + 1;
    },
    { message: `Ano deve estar entre 2000 e ${currentYear + 1}` }
  ),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface TeamInfo {
  id: string;
  name: string;
  logo_url: string;
  captain_id: string;
  event_id: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTeams, setUserTeams] = useState<TeamInfo[]>([]);
  const [pastTeams, setPastTeams] = useState<Time[]>([]);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [leaveTeamDialog, setLeaveTeamDialog] = useState<{ open: boolean; team: TeamInfo | null }>({ open: false, team: null });
  const [leaveConfirmation, setLeaveConfirmation] = useState("");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      nivel: "",
      periodo: "",
      anoIngresso: String(currentYear),
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadProfile = async () => {
      try {
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (usuario) {
          setUserId(usuario.id!);
          form.setValue('fullName', usuario.nome || '');
          form.setValue('nivel', usuario.nivel !== undefined && usuario.nivel !== null ? String(usuario.nivel) : '');
          form.setValue('periodo', usuario.periodo !== undefined && usuario.periodo !== null ? String(usuario.periodo) : '');
          form.setValue('anoIngresso', usuario.ano_ingresso ? String(usuario.ano_ingresso) : String(currentYear));
          setAvatarUrl(usuario.url_image_perfil || '');
          if (usuario.sede !== undefined && usuario.sede !== null) setSedeId(Number(usuario.sede));

          // Buscar todos os times do usuário (em todos os eventos)
          try {
            const todosOsTimes = await listarTimes({ evento: null });
            const timesDoUsuario = todosOsTimes.filter((t: Time) => {
              if (t.dono_id === usuario.id) return true;
              const integrantes = t.integrantes || [];
              return integrantes.some((i: any) => i.usuario_id === usuario.id);
            });

            const anteriores = timesDoUsuario.filter(
              (t: Time) => t.evento != null && Number(t.evento) !== Number(EVENTO_ATUAL)
            );
            setPastTeams(anteriores);

            const teamsInfo: TeamInfo[] = timesDoUsuario.map((t: Time) => ({
              id: String(t.id),
              name: t.nome_time || 'Meu Time',
              logo_url: t.imagem_time || '',
              captain_id: t.dono_id != null ? String(t.dono_id) : '',
              event_id: t.evento != null ? String(t.evento) : ''
            }));

            setUserTeams(teamsInfo);
          } catch (error) {
            console.error("Erro ao carregar times do usuário:", error);
            setUserTeams([]);
            setPastTeams([]);
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        toast.error("Erro ao carregar perfil");
      }
    };

    loadProfile();
  }, [user, navigate, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !userId) return;

    if (!sedeId) {
      toast.error("Selecione a sua sede/campus");
      return;
    }

    setIsSubmitting(true);
    try {
      await alterarUsuario(userId, {
        sede: sedeId,
        nome: data.fullName.trim(),
        ano_ingresso: parseInt(data.anoIngresso),
        periodo: parseInt(data.periodo),
        nivel: parseInt(data.nivel),
        categoria: parseInt(data.nivel),
        url_image_perfil: avatarUrl,
        email: user.email || '',
        token_gmail: user.email || '',
      });

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveTeam = async () => {
    const team = leaveTeamDialog.team;
    if (!userId || !team) return;

    const teamName = team.name.trim();
    if (leaveConfirmation.trim().toLowerCase() !== teamName.toLowerCase()) {
      toast.error("Digite o nome do time exatamente para confirmar");
      return;
    }

    setIsLeavingTeam(true);
    try {
      const resultado = await sairDoTime(Number(team.id), userId);
      toast.success(resultado?.message || "Você saiu do time");
      setUserTeams((prev) => prev.filter((t) => String(t.id) !== String(team.id)));
      setLeaveTeamDialog({ open: false, team: null });
      setLeaveConfirmation("");
    } catch (error: any) {
      console.error("Erro ao sair do time:", error);
      toast.error("Erro ao sair do time: " + error.message);
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleDeleteAccount = async () => {
    const fullName = (form.getValues("fullName") || "").trim();

    if (!userId) return;

    if (!fullName || deleteConfirmation.trim().toLowerCase() !== fullName.toLowerCase()) {
      toast.error("Digite seu nome completo exatamente como está no perfil para confirmar");
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deletarUsuario(userId, "apagar_usuario");
      await signOut();
      toast.success("Conta excluída com sucesso! Você será desconectado.");
      setTimeout(() => {
        navigate("/auth");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Erro ao excluir conta: " + error.message);
    } finally {
      setIsDeletingAccount(false);
      setDeleteConfirmation("");
    }
  };


  const handleDeleteTeam = async (teamId: number) => {
    if (!teamId) return;

    setIsDeletingTeam(true);
    try {
      await deletarTime(teamId);
      toast.success("Time deletado com sucesso!");
      setUserTeams((prev) => prev.filter((t) => String(t.id) !== String(teamId)));
      setPastTeams((prev) => prev.filter((t) => String(t.id) !== String(teamId)));
    } catch (error: any) {
      console.error("Erro ao deletar time:", error);
      toast.error("Erro ao deletar time: " + error.message);
    } finally {
      setIsDeletingTeam(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Eventos anteriores — só aparece se o usuário já participou de outra edição */}
          {pastTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Eventos anteriores
                </CardTitle>
                <CardDescription>
                  Edições da Copa em que você já participou. Você pode duplicar um desses times para a
                  edição atual — nome, logo e miniatura são reaproveitados, os membros não.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pastTeams.map((t) => (
                  <div
                    key={`past-${t.id}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={t.imagem_time || '/placeholder.svg'}
                        alt={t.nome_time}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="text-lg font-bold">{t.nome_time}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Trophy className="w-4 h-4" />
                          <span>Edição {t.evento}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate("/teams", { state: { duplicarTime: t } })}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicar para a edição atual
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Seção dos Times */}
          {userTeams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Meus Times
                </CardTitle>
                <CardDescription>
                  Times em que você participa, organizados por edição do evento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTeams.map((team) => {
                    const isCaptain = userId != null && String(team.captain_id) === String(userId);
                    return (
                      <div
                        key={team.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={team.logo_url || '/placeholder.svg'}
                            alt={team.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                          <div>
                            <h3 className="text-xl font-bold">{team.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Trophy className="w-4 h-4" />
                              <span>Edição {team.event_id || '-'}</span>
                              {isCaptain && (
                                <span className="text-primary">• Você é o capitão</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/team-details/${team.id}`)}
                          >
                            Ver time
                          </Button>

                          {isCaptain ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={isDeletingTeam}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  {isDeletingTeam ? "Deletando..." : "Deletar time"}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Time</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja deletar o time "{team.name}"? Essa ação não pode ser desfeita e removerá todos os integrantes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTeam(Number(team.id))}>
                                    Deletar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <AlertDialog open={leaveTeamDialog.open && leaveTeamDialog.team?.id === team.id} onOpenChange={(open) => { if (!open) { setLeaveTeamDialog({ open: false, team: null }); setLeaveConfirmation(""); } }}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled={isLeavingTeam}
                                  onClick={() => setLeaveTeamDialog({ open: true, team })}
                                >
                                  <LogOut className="w-4 h-4" />
                                  <span className="sr-only sm:not-sr-only sm:ml-2">Sair</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Sair do Time</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja sair do time <span className="font-medium text-foreground">"{team.name}"</span>? Para confirmar, digite o nome completo do time.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                  value={leaveConfirmation}
                                  onChange={(e) => setLeaveConfirmation(e.target.value)}
                                  placeholder="Digite o nome do time"
                                  autoComplete="off"
                                />
                                <AlertDialogFooter>
                                  <AlertDialogCancel onClick={() => { setLeaveTeamDialog({ open: false, team: null }); setLeaveConfirmation(""); }}>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => { e.preventDefault(); handleLeaveTeam(); }}
                                    disabled={isLeavingTeam || leaveConfirmation.trim().toLowerCase() !== team.name.trim().toLowerCase()}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {isLeavingTeam ? "Saindo..." : "Sair"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seção do Perfil */}
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Dados Pessoais</CardTitle>
             <CardDescription className="text-lg">
               Atualize suas informações pessoais
             </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex justify-center">
                    <AvatarSelector
                      currentAvatar={avatarUrl}
                      onAvatarChange={setAvatarUrl}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome completo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nivel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nível de Ensino *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o nível de ensino" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NIVEIS_ENSINO.map((n) => (
                              <SelectItem key={n.value} value={String(n.value)}>{n.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="anoIngresso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano de Ingresso *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2000}
                            max={currentYear + 1}
                            placeholder="Ex: 2024"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Ano em que você ingressou no curso.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <FormField
                    control={form.control}
                    name="periodo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Período *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERIODOS.map((p) => (
                              <SelectItem key={p.value} value={String(p.value)}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <SedeSelector value={sedeId} onChange={setSedeId} />

                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate("/")}
                  >
                    Voltar
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Exclusão de conta - discreta */}
          <div className="mt-6 flex justify-end">
            <AlertDialog onOpenChange={(open) => !open && setDeleteConfirmation("")}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-xs text-muted-foreground/70 underline underline-offset-4 hover:text-destructive transition-colors"
                >
                  Excluir minha conta
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Para confirmar, digite seu nome completo:{" "}
                    <span className="font-medium text-foreground">{form.getValues("fullName")}</span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Digite seu nome completo"
                  autoComplete="off"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteAccount();
                    }}
                    disabled={
                      isDeletingAccount ||
                      deleteConfirmation.trim().toLowerCase() !==
                        (form.getValues("fullName") || "").trim().toLowerCase()
                    }
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? "Excluindo..." : "Excluir conta"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

        </div>
      </main>
    </div>
  );
}
