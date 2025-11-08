import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { adicionarIntegrante, listarUsuarios, listarTimes } from "@/services/api";

const joinTeamSchema = z.object({
  inviteCode: z.string().trim().min(1, "Digite o código de convite"),
});

type JoinTeamFormData = z.infer<typeof joinTeamSchema>;

interface JoinTeamFormProps {
  onSuccess: () => void;
}

export function JoinTeamForm({ onSuccess }: JoinTeamFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);

  const form = useForm<JoinTeamFormData>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: {
      inviteCode: "",
    },
  });

  const onSubmit = async (data: JoinTeamFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsJoining(true);

    try {
      // Verificar se usuário já tem perfil completo via API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.token_gmail === user.id);

      if (!usuario) {
        toast.error("Complete seu perfil primeiro");
        navigate("/complete-profile");
        return;
      }

      // Buscar todos os times para encontrar o que tem esse código
      const times = await listarTimes();
      const timeEncontrado = times.find(t => t.senha_convite === data.inviteCode);

      if (!timeEncontrado) {
        toast.error("Código de convite inválido");
        return;
      }

      // Entrar no time via API
      await adicionarIntegrante(timeEncontrado.id!, {
        usuario_id: usuario.id!,
        funcao: "Membro",
      });

      toast.success(`Você entrou no time com sucesso!`);
      form.reset();
      onSuccess();
    } catch (error: any) {
      console.error("Error joining team:", error);
      toast.error("Erro ao entrar no time: " + error.message);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Entrar em um Time
        </CardTitle>
        <CardDescription>
          Digite o código de convite que você recebeu do capitão do time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="inviteCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código de Convite</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite o código aqui" 
                      className="font-mono text-lg text-center"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isJoining}>
              {isJoining ? "Entrando..." : "Entrar no Time"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
