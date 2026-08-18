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
import { AlertCircle, Users, LogOut, Edit, Trash2 } from "lucide-react";
import { listarUsuarios, mostrarTimeUsuario, alterarUsuario, sairDoTime, deletarTime, deletarUsuario } from "@/services/api";

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  classroom: z.string().min(1, "Turma é obrigatória"),
  period: z.string().min(1, "Selecione um período"),
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
  const [currentTeam, setCurrentTeam] = useState<TeamInfo | null>(null);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      classroom: "",
      period: "",
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
          form.setValue('classroom', usuario.turma ? usuario.turma.toString() : '');
          form.setValue('period', usuario.periodo ? usuario.periodo.toString() : '');
          setAvatarUrl(usuario.url_image_perfil || '');

          // Buscar time do usuário
           const timeUsuario = await mostrarTimeUsuario(usuario.id!);
           if (timeUsuario && timeUsuario.id != null) {
             setTeamId(timeUsuario.id);
             setCurrentTeam({
               id: String(timeUsuario.id),
               name: timeUsuario.nome_time || 'Meu Time',
               logo_url: timeUsuario.imagem_time || '',
               captain_id: timeUsuario.dono_id != null ? String(timeUsuario.dono_id) : '',
               event_id: ''
             });
           } else {
             setTeamId(null);
             setCurrentTeam(null);
             console.warn("Time do usuário ausente ou inválido:", timeUsuario);
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
        turma: parseInt(data.classroom),
        periodo: parseInt(data.period),
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

  const handleEditTeam = () => {
    if (currentTeam) {
      navigate(`/team-edit/${currentTeam.id}`);
    }
  };

  // DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada
  const handleDeleteAccount = async () => {
    toast.info("Funcionalidade de deletar conta temporariamente desativada");
    return;
    
    /* CÓDIGO ORIGINAL - Para reativar, descomente e remova o return acima
    if (!userId || deleteConfirmation !== "apagar_usuario") {
      toast.error("Digite 'apagar_usuario' para confirmar");
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Deletar usuário e remover de todos os times
      await deletarUsuario(userId, deleteConfirmation);
      
      // Fazer logout do Google/Supabase
      await signOut();
      
      toast.success("Conta excluída com sucesso! Você será desconectado.");
      
      // Aguardar um pouco para o logout processar
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
    */
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

  const isCaptain = currentTeam && user && currentTeam.captain_id === user.id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Seção do Time */}
          {currentTeam && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Meu Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={currentTeam.logo_url} 
                      alt={currentTeam.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-xl font-bold">{currentTeam.name}</h3>
                      {isCaptain && (
                        <span className="text-sm text-muted-foreground">Você é o capitão</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {/* DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada */}
                    {isCaptain && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={true}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar Time (Desativado)
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
                        <Button variant="destructive" disabled={true}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Sair do Time (Desativado)
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
                    name="classroom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Turma *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a turma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">Turma 1 (Manhã)</SelectItem>
                            <SelectItem value="2">Turma 2 (Tarde)</SelectItem>
                          </SelectContent>
                        </Select>
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
                            <SelectItem value="1">1º Período</SelectItem>
                            <SelectItem value="2">2º Período</SelectItem>
                            <SelectItem value="3">3º Período</SelectItem>
                            <SelectItem value="4">4º Período</SelectItem>
                            <SelectItem value="5">5º Período</SelectItem>
                            <SelectItem value="6">6º Período</SelectItem>
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

          {/* Seção de Exclusão de Conta */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Zona de Perigo
              </CardTitle>
              <CardDescription>
                Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente excluídos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* DESATIVADO TEMPORARIAMENTE - Persistência de dados bloqueada */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={true}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Conta (Desativado)
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Exclusão de Conta</AlertDialogTitle>
                    <AlertDialogDescription>
                      Funcionalidade temporariamente desativada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Fechar</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
