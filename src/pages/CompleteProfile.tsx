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
import { NIVEIS_ENSINO } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const currentYear = new Date().getFullYear();

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
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

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    if (!sedeId) {
      toast.error("Selecione a sua sede/campus");
      return;
    }

    setIsSubmitting(true);
    try {
      const { criarUsuario } = await import("@/services/api");

      const nivel = parseInt(data.nivel);
      const userData: any = {
        nome: data.fullName.trim(),
        token_gmail: user.email,
        ano_ingresso: parseInt(data.anoIngresso),
        email: user.email,
        url_image_perfil: avatarUrl || "",
        sede: sedeId,
        nivel,
        categoria: nivel,
      };

      await criarUsuario(userData);

      toast.success("Cadastro completo! Agora você pode criar ou entrar em um time.");
      navigate("/teams");
    } catch (error: any) {
      console.error("Erro completo ao criar usuário:", error);
      
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

              <div className="pt-2 border-t">
                <SedeSelector value={sedeId} onChange={setSedeId} />
              </div>

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
