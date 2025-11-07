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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { AlertCircle } from "lucide-react";

const profileSchema = z.object({
  fullName: z.string().min(3, "Nome completo deve ter pelo menos 3 caracteres"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  classroom: z.string().min(1, "Selecione uma turma"),
  classroomGroup: z.enum(["A", "B"], { required_error: "Selecione um grupo" }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [eventDate, setEventDate] = useState<Date | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      cpf: "",
      classroom: "",
      classroomGroup: undefined,
    },
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadProfileAndCheckEvent = async () => {
      // Carregar perfil do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        form.setValue('fullName', profile.full_name || '');
        form.setValue('cpf', profile.cpf || '');
        setAvatarUrl(profile.avatar_url || '');
      }

      // Buscar membro do time para pegar classroom e classroomGroup
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('classroom, classroom_group')
        .eq('user_id', user.id)
        .single();

      if (teamMember) {
        form.setValue('classroom', teamMember.classroom);
        form.setValue('classroomGroup', teamMember.classroom_group);
      }

      // Verificar a data do evento ativo
      const { data: event } = await supabase
        .from('events')
        .select('event_date')
        .eq('is_active', true)
        .single();

      if (event?.event_date) {
        const eventStartDate = new Date(event.event_date);
        setEventDate(eventStartDate);
        const now = new Date();
        
        // Não pode editar se a data do evento já passou
        if (now >= eventStartDate) {
          setCanEdit(false);
        }
      }
    };

    loadProfileAndCheckEvent();
  }, [user, navigate, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !canEdit) return;

    setIsSubmitting(true);
    try {
      // Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.fullName,
          cpf: data.cpf,
          avatar_url: avatarUrl,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Atualizar informações do team_member se existir
      const { error: memberError } = await supabase
        .from('team_members')
        .update({
          classroom: data.classroom,
          classroom_group: data.classroomGroup,
        })
        .eq('user_id', user.id);

      if (memberError && memberError.code !== 'PGRST116') { // Ignora erro se não existir registro
        throw memberError;
      }

      toast.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao atualizar perfil: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Meu Perfil</CardTitle>
            <CardDescription className="text-lg">
              {canEdit ? "Edite suas informações de cadastro" : "Visualize suas informações de cadastro"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canEdit && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não é possível editar suas informações pois o evento já iniciou em {eventDate?.toLocaleDateString('pt-BR')}.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex justify-center">
                  <AvatarSelector
                    currentAvatar={avatarUrl}
                    onAvatarChange={setAvatarUrl}
                    disabled={!canEdit}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome completo" 
                          {...field} 
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="12345678900" 
                          maxLength={11}
                          {...field} 
                          disabled={!canEdit}
                        />
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
                        <Input 
                          placeholder="Ex: 3º Ano" 
                          {...field} 
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classroomGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grupo da Turma *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!canEdit}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o grupo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">Grupo A</SelectItem>
                          <SelectItem value="B">Grupo B</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canEdit && (
                  <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}

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
      </main>
    </div>
  );
}
