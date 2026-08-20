import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { criarTime, listarUsuarios, listarTimes, listarTimesTodosEventos, adicionarIntegrante, deletarTime, buscarTimesPorDono, definirCorTime, EVENTO_ATUAL, type Time } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Check, Mail, MessageCircle, MapPin, GraduationCap, History } from "lucide-react";
import { TeamLogoUploader } from "./TeamLogoUploader";
import { listarSedesPorEvento, labelNivel, type Sede, type Usuario } from "@/services/api";
import { TeamColorPicker, type CorSelecionada } from "./TeamColorPicker";
import { SedeSelector } from "./SedeSelector";

const createTeamSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome deve ter no máximo 50 caracteres"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  onSuccess: (teamId?: number) => void;
  /** Time de uma edição anterior para pré-preencher o formulário (duplicação) */
  timeParaDuplicar?: Time | null;
}

export function CreateTeamForm({ onSuccess, timeParaDuplicar = null }: CreateTeamFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [miniLogoUrl, setMiniLogoUrl] = useState<string>("");
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [timesAnteriores, setTimesAnteriores] = useState<Time[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [createdTeamId, setCreatedTeamId] = useState<number | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [senhaConvite, setSenhaConvite] = useState("");
  const [perfil, setPerfil] = useState<Usuario | null>(null);
  const [sede, setSede] = useState<Sede | null>(null);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [cor, setCor] = useState<CorSelecionada | null>(null);

  // A sede é sugerida (cadastro/localização) mas pode ser alterada pelo usuário
  const nivelUsuario = perfil?.nivel ?? perfil?.categoria ?? null;

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

  // Carrega o perfil do usuário para herdar campus e nível de ensino
  useEffect(() => {
    if (!user?.email) return;
    let cancelled = false;
    (async () => {
      try {
        const usuarios = await listarUsuarios();
        const encontrado = usuarios.find((u) => u.email === user.email) ?? null;
        if (cancelled) return;
        setPerfil(encontrado);
        if (encontrado?.sede) {
          setSedeId((atual) => atual ?? encontrado.sede ?? null);
          const sedes = await listarSedesPorEvento();
          if (!cancelled) setSede(sedes.find((s) => s.id === encontrado.sede) ?? null);
        }
        // Times de edições anteriores do próprio usuário (para duplicar)
        if (encontrado?.id) {
          try {
            const todos = await listarTimesTodosEventos();
            if (!cancelled) {
              setTimesAnteriores(
                todos.filter(
                  (t) => t.dono_id === encontrado.id && Number(t.evento) !== Number(EVENTO_ATUAL)
                )
              );
            }
          } catch (err) {
            console.error("Erro ao carregar times de edições anteriores:", err);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar perfil do usuário:", error);
      } finally {
        if (!cancelled) setLoadingPerfil(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const usuarioIdRef = useRef<number | null>(null);

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
    },
  });

  // Pré-preenche quando o usuário escolheu duplicar um time de edição anterior (vindo do perfil)
  useEffect(() => {
    if (!timeParaDuplicar) return;
    form.setValue("name", timeParaDuplicar.nome_time ?? "");
    if (timeParaDuplicar.imagem_time) setLogoUrl(timeParaDuplicar.imagem_time);
    if (timeParaDuplicar.img_logo_pequeno) setMiniLogoUrl(timeParaDuplicar.img_logo_pequeno);
    toast.success("Dados do time anterior copiados", {
      description: "Escolha a cor do time nesta edição. Os membros não foram duplicados.",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeParaDuplicar?.id]);



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

    if (!miniLogoUrl) {
      toast.error("A miniatura do logo (mini logo) é obrigatória");
      return;
    }

    if (!senhaConvite || senhaConvite.length !== 5) {
      toast.error("A senha de convite deve ter exatamente 5 caracteres");
      return;
    }

    if (!sedeId) {
      toast.error("Seu cadastro não tem um campus definido", {
        description: "Atualize seu cadastro com a sede/campus antes de criar um time.",
      });
      return;
    }

    if (nivelUsuario === null || nivelUsuario === undefined) {
      toast.error("Seu cadastro não tem nível de ensino definido", {
        description: "Informe se você é do Ensino Médio ou da Graduação antes de criar um time.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar informações do usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);
      usuarioIdRef.current = usuario?.id ?? null;

      if (!usuario || !usuario.id) {
        toast.error("Complete suas informações de cadastro primeiro");
        setIsSubmitting(false);
        return;
      }

      // Verificar se já existe um time com o mesmo nome NESTE EVENTO
      const timesEventoAtual = await listarTimes({ evento: EVENTO_ATUAL });
      const timeExistente = timesEventoAtual.find(
        t => t.nome_time.toLowerCase().trim() === data.name.toLowerCase().trim()
      );

      if (timeExistente) {
        toast.error("Já existe um time com esse nome nesta edição. Por favor, escolha outro nome.");
        setIsSubmitting(false);
        return;
      }

      // Verificar se o usuário já é dono de algum time NESTE EVENTO
      const timesDoUsuarioNesteEvento = await buscarTimesPorDono(usuario.id, EVENTO_ATUAL);
      
      if (timesDoUsuarioNesteEvento && timesDoUsuarioNesteEvento.length > 0) {
        const timeAntigo = timesDoUsuarioNesteEvento[0];
        
        toast.error("Você já é dono de um time nesta edição", {
          description: `Time: ${timeAntigo.nome_time}. Vá em 'Meu Time', saia ou transfira a liderança e tente novamente.`,
          duration: 8000,
        });
        setIsSubmitting(false);
        return;
      }

      // Criar time usando a API (a cor é definida em rota dedicada)
      // Campus e nível de ensino são copiados do dono no momento da criação
      const novoTime = await criarTime({
        nome_time: data.name,
        dono_id: usuario.id,
        senha_convite: senhaConvite,
        imagem_time: logoUrl,
        img_logo_pequeno: miniLogoUrl || undefined,
        sede: sedeId,
        categoria: usuario.nivel ?? usuario.categoria ?? nivelUsuario,
        evento: EVENTO_ATUAL,
      });

      // Buscar o time recém-criado pelo código de convite
      const timesAtualizados = await listarTimes();
      const timeCriado = timesAtualizados.find(t => t.senha_convite === senhaConvite);

      if (timeCriado && timeCriado.id) {
        setCreatedTeamId(Number(timeCriado.id));
        // Adicionar o criador como integrante com função "Líder"
        try {
          await adicionarIntegrante(timeCriado.id, {
            usuario_id: usuario.id,
            funcao: "Líder",
            evento: EVENTO_ATUAL,
          });
        } catch (integranteError: any) {

          // Pode já ter sido adicionado automaticamente pela API
          console.warn("Não foi possível adicionar o líder (talvez já exista):", integranteError);
        }

        // Definir a cor do time pela rota dedicada (respeita limite por sede)
        if (cor) {
          try {
            await definirCorTime(timeCriado.id, {
              dono_id: usuario.id,
              cor_id: cor.cor_id,
              cor_time: cor.cor_time,
            });
          } catch (corError: any) {
            console.error("Erro ao definir cor do time:", corError);
            toast.warning("Time criado, mas a cor não pôde ser aplicada", {
              description: corError.message,
            });
          }
        }
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

      // A API pode responder erro mesmo tendo gravado o time: confirmamos antes de avisar
      try {
        const criados = await listarTimes({ evento: EVENTO_ATUAL });
        const jaCriado = criados.find(
          (t) =>
            t.senha_convite === senhaConvite ||
            (t.dono_id === usuarioIdRef.current &&
              (t.nome_time || "").toLowerCase().trim() === data.name.toLowerCase().trim())
        );
        if (jaCriado) {
          if (jaCriado.id != null) setCreatedTeamId(Number(jaCriado.id));
          setInviteCode(jaCriado.senha_convite || senhaConvite);
          setShowInviteDialog(true);
          toast.success("Time criado com sucesso!");
          form.reset();
          setLogoUrl("");
          setIsSubmitting(false);
          return;
        }
      } catch (verifyError) {
        console.error("Falha ao verificar criação do time:", verifyError);
      }

      // Duplicata de dono_id: a API mantém a restrição sem considerar o evento
      const msg = String(error?.message ?? "");
      if (msg.includes("times_dono_id_key") || msg.includes("duplicate key")) {

        let detalhe = "";
        try {
          const todos = await listarTimes({ evento: null });
          const donoDe = todos.filter((t) => t.dono_id === usuarioIdRef.current);
          const outroEvento = donoDe.find(
            (t) => t.evento != null && Number(t.evento) !== Number(EVENTO_ATUAL)
          );
          if (outroEvento) {
            detalhe = ` Você consta como dono do time "${outroEvento.nome_time}" da edição ${outroEvento.evento}.`;
          }
        } catch {
          // ignora falha ao detalhar
        }
        toast.error("A API ainda não permite ser dono de dois times", {
          description:
            `O servidor bloqueou o cadastro porque o mesmo dono já possui um time (a validação da rota /times não leva o evento em conta).${detalhe} Peça a liberação por edição ou transfira a liderança do time anterior.`,
          duration: 10000,
        });
      } else {
        toast.error("Erro ao criar time: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const duplicarTime = (time: Time) => {
    form.setValue("name", time.nome_time ?? "");
    if (time.imagem_time) setLogoUrl(time.imagem_time);
    if (time.img_logo_pequeno) setMiniLogoUrl(time.img_logo_pequeno);
    toast.success("Dados do time anterior copiados", {
      description: "Escolha a cor do time nesta edição. Os membros não foram duplicados.",
    });
  };

  const handleDialogClose = () => {
    setShowInviteDialog(false);
    onSuccess(createdTeamId ?? undefined);
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
                {timesAnteriores.length > 0 && (
                  <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      <Label>Duplicar time de edições anteriores</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reaproveite nome, logo, miniatura e cor do seu time anterior. Os membros não são
                      copiados — você adiciona os novos integrantes depois.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {timesAnteriores.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-3 rounded-md border bg-background p-2"
                        >
                          {t.imagem_time && (
                            <img
                              src={t.imagem_time}
                              alt={`Logo ${t.nome_time}`}
                              className="w-10 h-10 object-contain rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{t.nome_time}</p>
                            <p className="text-xs text-muted-foreground">Evento {t.evento ?? "-"}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => duplicarTime(t)}
                          >
                            Duplicar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <TeamLogoUploader
                  currentLogo={logoUrl}
                  onLogoChange={setLogoUrl}
                  maxSizeKB={400}
                />

                <TeamLogoUploader
                  currentLogo={miniLogoUrl}
                  onLogoChange={setMiniLogoUrl}
                  label="Miniatura do Logo (mini logo) *"
                  description="Versão reduzida do logo, usada em listagens (máx. 50KB). Envie um arquivo ou cole o link de uma imagem externa."
                  maxSizeKB={50}
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

                <div className="pt-2 border-t space-y-3">
                  <SedeSelector value={sedeId} onChange={setSedeId} />
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      {loadingPerfil
                        ? "Carregando..."
                        : sede
                          ? `Sede do cadastro: ${sede.nome_campus} — ${sede.cidade}/${sede.uf}`
                          : "Campus não definido no seu cadastro"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                      <GraduationCap className="w-4 h-4 text-muted-foreground" />
                      {loadingPerfil ? "Carregando..." : labelNivel(nivelUsuario ?? undefined)}
                    </span>
                  </div>
                </div>


                <div className="pt-2 border-t">
                  <TeamColorPicker sedeId={sedeId} value={cor} onChange={setCor} />
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
