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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
  classroom: z.string().trim().min(1, "Turma é obrigatória").max(50, "Turma deve ter no máximo 50 caracteres"),
  period: z.string().min(1, "Selecione um período"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    const checkProfile = async () => {
      try {
        const { listarUsuarios } = await import("@/services/api");
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (usuario) {
          navigate("/teams");
        }
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };

    checkProfile();
  }, [user, navigate, form]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;

    if (!user.email) {
      toast.error("Email não encontrado. Por favor, faça login novamente.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { criarUsuario } = await import("@/services/api");
      
      const userData: any = {
        nome: data.fullName.trim(),
        token_gmail: user.email,
        turma: parseInt(data.classroom),
        periodo: parseInt(data.period),
        email: user.email,
      };

      // Só adiciona url_image_perfil se tiver valor
      if (avatarUrl && avatarUrl.trim()) {
        userData.url_image_perfil = avatarUrl.trim();
      }

      console.log("Enviando dados para API:", userData);

      await criarUsuario(userData);

      toast.success("Cadastro completo! Agora você pode criar ou entrar em um time.");
      navigate("/teams");
    } catch (error: any) {
      console.error("Erro completo ao criar usuário:", error);
      
      // Tentar extrair mensagem de erro da API
      let errorMessage = "Erro desconhecido";
      if (error.response?.data) {
        console.error("Resposta da API:", error.response.data);
        errorMessage = typeof error.response.data === 'string' 
          ? error.response.data 
          : error.response.data.message || JSON.stringify(error.response.data);
      } else {
        errorMessage = error.message;
      }
      
      toast.error("Erro ao salvar dados: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Complete seu Cadastro</CardTitle>
          <CardDescription className="text-lg">
            Preencha seus dados para continuar
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
                {isSubmitting ? "Salvando..." : "Continuar"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
