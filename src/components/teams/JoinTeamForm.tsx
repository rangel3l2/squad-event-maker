import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const joinTeamSchema = z.object({
  teamId: z.string().min(1, "Selecione um time"),
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  classroom: z.string().min(1, "Informe sua sala"),
  classroomGroup: z.enum(["A", "B"], { required_error: "Selecione um grupo" }),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos"),
});

type JoinTeamFormData = z.infer<typeof joinTeamSchema>;

interface Team {
  id: string;
  name: string;
  logo_url: string;
}

interface JoinTeamFormProps {
  onSuccess: () => void;
}

export function JoinTeamForm({ onSuccess }: JoinTeamFormProps) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      teamId: "",
      fullName: "",
      classroom: "",
      classroomGroup: undefined,
      cpf: "",
    },
  });

  useEffect(() => {
    loadTeams();
    loadUserProfile();
  }, []);

  const loadTeams = async () => {
    const { data: events } = await supabase
      .from("events")
      .select("id")
      .eq("is_active", true)
      .single();

    if (!events) return;

    const { data } = await supabase
      .from("teams")
      .select("id, name, logo_url")
      .eq("event_id", events.id)
      .order("name");

    if (data) setTeams(data);
  };

  const loadUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("full_name, cpf")
      .eq("id", user.id)
      .single();

    if (data) {
      form.setValue("fullName", data.full_name || "");
      if (data.cpf) {
        form.setValue("cpf", data.cpf);
      }
    }
  };

  const onSubmit = async (data: JoinTeamFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile with CPF
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          cpf: data.cpf,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Join team
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: data.teamId,
          user_id: user.id,
          classroom: data.classroom,
          classroom_group: data.classroomGroup,
        });

      if (memberError) throw memberError;

      toast.success("Você entrou no time com sucesso!");
      onSuccess();
    } catch (error: any) {
      console.error("Error joining team:", error);
      if (error.code === "23505") {
        toast.error("Você já está neste time");
      } else {
        toast.error("Erro ao entrar no time");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar em um Time</CardTitle>
        <CardDescription>Escolha um time e preencha suas informações</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selecione o Time *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-6 h-6 object-cover rounded"
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="classroom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sala *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 3º Ano" {...field} />
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
                    <FormLabel>Grupo *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Grupo" />
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
            </div>

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite apenas números"
                      maxLength={11}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Necessário para emissão do certificado
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando..." : "Entrar no Time"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}