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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { AlertCircle, Users, LogOut, Edit, Trash2, Trophy, History, Copy } from "lucide-react";
import { listarUsuarios, alterarUsuario, sairDoTime, deletarTime, deletarUsuario, listarTimes, EVENTO_ATUAL, NIVEIS_ENSINO, type Time } from "@/services/api";

const currentYear = new Date().getFullYear();

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  nivel: z.string().min(1, "Selecione o nível de ensino"),
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userTeams, setUserTeams] = useState<TeamInfo[]>([]);
  const [pastTeams, setPastTeams] = useState<Time[]>([]);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      nivel: "",
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
          form.setValue('anoIngresso', usuario.ano_ingresso ? String(usuario.ano_ingresso) : String(currentYear));
          setAvatarUrl(usuario.url_image_perfil || '');

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

    setIsSubmitting(true);
    try {
      await alterarUsuario(userId, {
        nome: data.fullName.trim(),
        ano_ingresso: parseInt(data.anoIngresso),
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

  // DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada
  const handleLeaveTeam = async () => {
    toast.info("Funcionalidade de sair do time temporariamente desativada");
    return;
    
    /* CÓDIGO ORIGINAL - Para reativar, descomente e remova o return acima
    if (!userId || !teamId) return;

    setIsLeavingTeam(true);
    try {
      const resultado = await sairDoTime(teamId, userId);
      
      toast.success(resultado.message);
      setCurrentTeam(null);
      
      setTimeout(() => {
        navigate("/teams");
      }, 1000);
    } catch (error: any) {
      toast.error("Erro ao sair do time: " + error.message);
    } finally {
      setIsLeavingTeam(false);
    }
    */
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


  // DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada
  const handleDeleteTeam = async () => {
    toast.info("Funcionalidade de deletar time temporariamente desativada");
    return;
    
    /* CÓDIGO ORIGINAL - Para reativar, descomente e remova o return acima
    if (!teamId) return;

    setIsDeletingTeam(true);
    try {
      await deletarTime(teamId);
      
      toast.success("Time deletado com sucesso!");
      setCurrentTeam(null);
      
      setTimeout(() => {
        navigate("/teams");
      }, 1000);
    } catch (error: any) {
      console.error("Erro ao deletar time:", error);
      toast.error("Erro ao deletar time: " + error.message);
    } finally {
      setIsDeletingTeam(false);
    }
    */
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
                    const isCaptain = user && team.captain_id === user.id;
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

                          {/* DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada */}
                          {isCaptain && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={true}>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Deletar (Desativado)
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deletar Time</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Funcionalidade temporariamente desativada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Fechar</AlertDialogCancel>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={true}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair (Desativado)
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Sair do Time</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Funcionalidade temporariamente desativada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Fechar</AlertDialogCancel>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
                    name="tipoMedio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de curso *</FormLabel>
                        <Select
                          onValueChange={(v) => {
                            field.onChange(v);
                            form.setValue("classroom", "");
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de curso" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_MEDIO.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="classroom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isTecnico ? "Semestre atual *" : "Ano atual *"}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={isTecnico ? "Selecione o semestre" : "Selecione o ano"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isTecnico
                              ? SEMESTRES.map((s) => (
                                  <SelectItem key={s} value={String(s)}>{s}º semestre</SelectItem>
                                ))
                              : ANOS_MEDIO.map((a) => (
                                  <SelectItem key={a.value} value={String(a.value)}>
                                    {a.label} ({anoParaSemestre(a.value)}º período)
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {isTecnico
                            ? "Cursos técnicos são divididos em semestres/períodos."
                            : "No ensino médio regular a avaliação é anual — o ano é registrado como o período equivalente."}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="period"
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
