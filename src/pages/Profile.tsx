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
import { AlertCircle, Users, LogOut, Edit } from "lucide-react";
import { listarUsuarios, mostrarTimeUsuario, alterarUsuario, removerIntegrante } from "@/services/api";

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
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<TeamInfo | null>(null);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);

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
           console.log("Perfil - usuario:", usuario);
           console.log("Perfil - timeUsuario:", timeUsuario);
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
        nome: data.fullName,
        turma: parseInt(data.classroom),
        periodo: parseInt(data.period),
        url_image_perfil: avatarUrl,
        email: user.email || '',
        token_gmail: user.email || '', // Usando email ao invés de user.id
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
    if (!userId || !teamId) return;

    setIsLeavingTeam(true);
    try {
      await removerIntegrante(teamId, userId);

      toast.success("Você saiu do time com sucesso!");
      setCurrentTeam(null);
      
      setTimeout(() => {
        navigate("/teams");
      }, 1000);
    } catch (error: any) {
      toast.error("Erro ao sair do time: " + error.message);
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleEditTeam = () => {
    if (currentTeam) {
      navigate(`/team-edit/${currentTeam.id}`);
    }
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <LogOut className="w-4 h-4 mr-2" />
                          Sair do Time
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Você será removido do time "{currentTeam.name}". 
                            {isCaptain && " Como você é o capitão, o time ficará sem capitão."}
                            {" "}Você poderá entrar em outro time ou criar um novo depois.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleLeaveTeam}
                            disabled={isLeavingTeam}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isLeavingTeam ? "Saindo..." : "Sair do Time"}
                          </AlertDialogAction>
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
              Edite suas informações de cadastro
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
                        <FormControl>
                          <Input placeholder="Ex: 3" type="number" min="1" {...field} />
                        </FormControl>
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
        </div>
      </main>
    </div>
  );
}
