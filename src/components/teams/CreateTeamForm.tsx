import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { criarTime, listarUsuarios, listarTimes, adicionarIntegrante, deletarTime } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Mail, MessageCircle, Sparkles } from "lucide-react";
import { TeamLogoUploader } from "./TeamLogoUploader";
import { useNavigate } from "react-router-dom";

const createTeamSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  onSuccess: () => void;
}

export function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [inviteCode, setInviteCode] = useState<string>("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [senhaConvite, setSenhaConvite] = useState("");

  // Gerar senha de 5 caracteres automaticamente
  useEffect(() => {
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };
    setSenhaConvite(generateCode());

    // Check if there's a saved logo draft
    const savedLogo = localStorage.getItem('team_logo_draft');
    if (savedLogo) {
      setLogoUrl(savedLogo);
    }
  }, []);

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

  const shareViaWhatsApp = () => {
    const message = `Olá! Você foi convidado para entrar no time. Use o código: ${inviteCode}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = "Convite para entrar no time";
    const body = `Olá! Você foi convidado para entrar no time.\n\nUse o código de convite: ${inviteCode}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };

  const onSubmit = async (data: CreateTeamFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!logoUrl) {
      toast.error("O logo do time é obrigatório");
      return;
    }

    if (!senhaConvite || senhaConvite.length !== 5) {
      toast.error("A senha de convite deve ter exatamente 5 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar informações do usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario || !usuario.id) {
        toast.error("Complete suas informações de cadastro primeiro");
        setIsSubmitting(false);
        return;
      }

      // Verificar se já existe um time com o mesmo nome
      const times = await listarTimes();
      const timeExistente = times.find(
        t => t.nome_time.toLowerCase().trim() === data.name.toLowerCase().trim()
      );

      if (timeExistente) {
        toast.error("Já existe um time com esse nome. Por favor, escolha outro nome.");
        setIsSubmitting(false);
        return;
      }

      // Verificar se o usuário já é dono de algum time
      const timeDoUsuario = times.find(t => t.dono_id === usuario.id);
      if (timeDoUsuario) {
        // Tentar deletar o time antigo automaticamente
        console.log("=== ENCONTRADO TIME ANTIGO ===");
        console.log("Time antigo ID:", timeDoUsuario.id);
        console.log("Tentando deletar automaticamente...");
        
        try {
          if (timeDoUsuario.id) {
            await deletarTime(timeDoUsuario.id);
            console.log("Time antigo deletado com sucesso");
            toast.success("Time antigo removido. Criando novo time...");
            // Aguardar um pouco para garantir que o backend processou a deleção
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (deleteError: any) {
          console.error("Erro ao deletar time antigo:", deleteError);
          toast.error("Erro: Você já possui um time. Por favor, saia do time atual primeiro.", {
            description: `Time: ${timeDoUsuario.nome_time}. Vá em 'Meu Time' e clique em 'Sair do Time'.`,
            duration: 6000,
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Log dos dados que serão enviados
      console.log("=== DADOS PARA CRIAR TIME ===");
      console.log("Nome do time:", data.name);
      console.log("ID do dono:", usuario.id);
      console.log("Senha convite:", senhaConvite);
      console.log("URL da imagem:", logoUrl);
      console.log("Objeto completo:", {
        nome_time: data.name,
        dono_id: usuario.id,
        senha_convite: senhaConvite,
        imagem_time: logoUrl,
      });

      // Criar time usando a API
      const novoTime = await criarTime({
        nome_time: data.name,
        dono_id: usuario.id,
        senha_convite: senhaConvite,
        imagem_time: logoUrl,
      });

      console.log("Time criado:", novoTime);

      // Buscar o time recém-criado pelo código de convite
      const timesAtualizados = await listarTimes();
      const timeCriado = timesAtualizados.find(t => t.senha_convite === senhaConvite);

      if (timeCriado && timeCriado.id) {
        console.log("Adicionando criador como Líder do time:", timeCriado.id);
        
        // Adicionar o criador como integrante com função "Líder"
        await adicionarIntegrante(timeCriado.id, {
          usuario_id: usuario.id,
          funcao: "Líder"
        });

        console.log("Criador adicionado como Líder com sucesso!");
      }

      // Mostrar o código de convite
      setInviteCode(senhaConvite);
      setShowInviteDialog(true);
      toast.success("Time criado com sucesso!");

      form.reset();
      setLogoUrl("");
      // Gerar nova senha para próxima criação
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newCode = '';
      for (let i = 0; i < 5; i++) {
        newCode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setSenhaConvite(newCode);
    } catch (error: any) {
      console.error("Error creating team:", error);
      
      // Verificar se é erro de duplicata de dono_id
      if (error.message.includes("times_dono_id_key") || error.message.includes("duplicate key")) {
        toast.error("Você já é dono de um time", {
          description: "Você precisa sair do time atual antes de criar um novo. Vá em 'Meu Time' e clique em 'Sair do Time'.",
          duration: 6000,
        });
      } else {
        toast.error("Erro ao criar time: " + error.message);
      }
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
                <div className="flex items-center justify-between mb-2">
                  <Label>Logo do Time *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/logo-editor')}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Criar com Editor IA
                  </Button>
                </div>
                <TeamLogoUploader
                  currentLogo={logoUrl}
                  onLogoChange={setLogoUrl}
                />

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

                <div className="space-y-2">
                  <Label htmlFor="senha-convite">Senha de Convite (5 caracteres) *</Label>
                  <Input
                    id="senha-convite"
                    value={senhaConvite}
                    onChange={(e) => setSenhaConvite(e.target.value.toUpperCase().slice(0, 5))}
                    maxLength={5}
                    placeholder="Ex: ABC12"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Esta senha será usada para convidar membros para o time
                  </p>
                </div>
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
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shareViaWhatsApp} variant="outline" className="w-full">
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button onClick={shareViaEmail} variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
            <Button onClick={handleDialogClose} className="w-full">
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
