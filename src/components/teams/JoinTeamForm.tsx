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
      console.log("=== INICIANDO PROCESSO DE ENTRADA NO TIME ===");
      console.log("Código inserido:", data.inviteCode);
      console.log("Email do usuário logado:", user.email);

      // Verificar se usuário já tem perfil completo via API
      const usuarios = await listarUsuarios();
      console.log("Total de usuários encontrados:", usuarios.length);
      
      const usuario = usuarios.find(u => u.email === user.email);
      console.log("Usuário encontrado:", usuario);

      if (!usuario) {
        toast.error("Complete seu perfil primeiro");
        navigate("/complete-profile");
        return;
      }

      // Buscar todos os times para encontrar o que tem esse código
      const times = await listarTimes();
      console.log("=== TIMES DISPONÍVEIS ===");
      console.log("Total de times:", times.length);
      times.forEach(t => {
        console.log(`Time: ${t.nome_time}, Senha: ${t.senha_convite}, ID: ${t.id}, Integrantes:`, t.integrantes?.length || 0);
      });
      
      const timeEncontrado = times.find(t => t.senha_convite === data.inviteCode);
      console.log("Time encontrado com o código:", timeEncontrado);

      if (!timeEncontrado) {
        toast.error("Código de convite inválido");
        return;
      }

      // Verificar se o time já tem 4 integrantes
      const integrantesCount = timeEncontrado.integrantes?.length || 0;
      console.log("Quantidade de integrantes no time:", integrantesCount);
      
      if (integrantesCount >= 4) {
        toast.error("Este time já atingiu o limite máximo de 4 membros");
        return;
      }

      // Verificar se o usuário já é membro do time
      const jaEhMembro = timeEncontrado.integrantes?.some(
        (integrante: any) => integrante.usuario_id === usuario.id
      );
      
      if (jaEhMembro) {
        toast.error("Você já é membro deste time");
        return;
      }

      console.log("=== ADICIONANDO INTEGRANTE ===");
      console.log("Time ID:", timeEncontrado.id);
      console.log("Usuario ID:", usuario.id);
      console.log("Tipo do Usuario ID:", typeof usuario.id);
      console.log("Usuario completo:", JSON.stringify(usuario));
      
      if (!usuario.id) {
        toast.error("ID do usuário não encontrado");
        return;
      }
      
      // Entrar no time via API
      const integranteData = {
        usuario_id: usuario.id,
        funcao: "Membro",
      };
      console.log("Dados do integrante a serem enviados:", JSON.stringify(integranteData));
      
      const resultado = await adicionarIntegrante(timeEncontrado.id!, integranteData);
      
      console.log("=== RESULTADO DA ADIÇÃO ===");
      console.log(resultado);

      toast.success(`Você entrou no time "${timeEncontrado.nome_time}" com sucesso!`);
      form.reset();
      navigate("/team-details");
    } catch (error: any) {
      console.error("=== ERRO AO ENTRAR NO TIME ===", error);
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
