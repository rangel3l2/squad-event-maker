import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { criarTime, listarUsuarios } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { AvatarSelector } from "./AvatarSelector";

const createTeamSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  onSuccess: () => void;
}

export function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: CreateTeamFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!avatarUrl) {
      toast.error("Selecione uma imagem para o time");
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar informações do usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario) {
        toast.error("Complete suas informações de cadastro primeiro");
        return;
      }

      // Criar time usando a API
      const novoTime = await criarTime({
        nome_time: data.name,
        dono_id: usuario.id!,
        imagem_time: avatarUrl,
      });

      // Mostrar o código de convite gerado
      if (novoTime.senha_convite) {
        setInviteCode(novoTime.senha_convite);
        setShowInviteDialog(true);
        toast.success("Time criado com sucesso!");
      }

      form.reset();
      setAvatarUrl("");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error("Erro ao criar time: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogClose = () => {
    setShowInviteDialog(false);
    onSuccess();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Time</CardTitle>
          <CardDescription>Preencha as informações do seu time</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <FormLabel>Imagem do Time *</FormLabel>
                  <div className="mt-2">
                    <AvatarSelector
                      currentAvatar={avatarUrl}
                      onAvatarChange={setAvatarUrl}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Time *</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome do time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Criando..." : "Criar Time"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Time Criado com Sucesso! 🎉</DialogTitle>
            <DialogDescription>
              Compartilhe este código com seus amigos para eles entrarem no time
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
              <code className="flex-1 text-2xl font-mono font-bold text-center">
                {inviteCode}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Guarde este código em um lugar seguro. Seus amigos precisarão dele para entrar no time.
            </p>
            <Button onClick={handleDialogClose} className="w-full">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
