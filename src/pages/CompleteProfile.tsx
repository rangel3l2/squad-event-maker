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
import { PERIODOS, NIVEIS_ENSINO, SEMESTRES, TIPOS_MEDIO, ANOS_MEDIO, anoParaSemestre } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Nome completo deve ter pelo menos 3 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
  tipoMedio: z.string().min(1, "Selecione o tipo de curso"),
  semestre: z.string().min(1, "Selecione o semestre/ano"),
  period: z.string().min(1, "Selecione um período"),
  nivel: z.string().min(1, "Selecione o nível de ensino"),
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
      tipoMedio: "tecnico",
      semestre: "",
      period: "",
      nivel: "",
    },
  });

  const isTecnico = form.watch("tipoMedio") !== "regular";


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
      // Ensino médio regular: o usuário escolhe o ano, mas a API recebe o período (ano * 2)
      const turma = isTecnico
        ? parseInt(data.semestre)
        : anoParaSemestre(parseInt(data.semestre));
      const userData: any = {
        nome: data.fullName.trim(),
        token_gmail: user.email,
        turma,
        periodo: parseInt(data.period),
        email: user.email,
        url_image_perfil: avatarUrl || "", // String vazia se não tiver
        sede: sedeId,
        nivel,
        categoria: nivel,
      };

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
                name="tipoMedio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de curso *</FormLabel>
                    <Select
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("semestre", "");
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
                name="semestre"
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
                        : "No ensino médio regular a avaliação é anual — o ano escolhido é registrado como o período equivalente."}
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
