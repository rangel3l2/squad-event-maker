import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { AlertCircle, Upload } from "lucide-react";

const teamSchema = z.object({
  name: z.string().min(3, "Nome do time deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  introVideoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor primária inválida"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor secundária inválida"),
});

type TeamFormData = z.infer<typeof teamSchema>;

export default function TeamEdit() {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canEdit, setCanEdit] = useState(true);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("");

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: "",
      description: "",
      introVideoUrl: "",
      primaryColor: "#8B5CF6",
      secondaryColor: "#3B82F6",
    },
  });

  useEffect(() => {
    if (!user || !teamId) {
      navigate("/auth");
      return;
    }

    const loadTeamData = async () => {
      // Buscar dados do time
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        toast.error("Time não encontrado");
        navigate("/profile");
        return;
      }

      // Verificar se o usuário é o capitão
      if (team.captain_id !== user.id) {
        toast.error("Apenas o capitão pode editar o time");
        navigate("/profile");
        return;
      }

      // Preencher formulário
      form.setValue('name', team.name);
      form.setValue('description', team.description || '');
      form.setValue('introVideoUrl', team.intro_video_url || '');
      form.setValue('primaryColor', team.primary_color);
      form.setValue('secondaryColor', team.secondary_color);
      setCurrentLogoUrl(team.logo_url);
      setLogoPreview(team.logo_url);

      // Verificar data do evento
      const { data: event } = await supabase
        .from('events')
        .select('event_date')
        .eq('id', team.event_id)
        .single();

      if (event?.event_date) {
        const eventStartDate = new Date(event.event_date);
        setEventDate(eventStartDate);
        const now = new Date();
        
        if (now >= eventStartDate) {
          setCanEdit(false);
        }
      }
    };

    loadTeamData();
  }, [user, teamId, navigate, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: TeamFormData) => {
    if (!user || !teamId || !canEdit) return;

    setIsSubmitting(true);
    try {
      let logoUrl = currentLogoUrl;

      // Upload do logo se foi alterado
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${teamId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("team-logos")
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("team-logos")
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      // Atualizar time
      const { error: updateError } = await supabase
        .from('teams')
        .update({
          name: data.name,
          description: data.description,
          intro_video_url: data.introVideoUrl || null,
          primary_color: data.primaryColor,
          secondary_color: data.secondaryColor,
          logo_url: logoUrl,
        })
        .eq('id', teamId);

      if (updateError) throw updateError;

      toast.success("Time atualizado com sucesso!");
      navigate("/profile");
    } catch (error: any) {
      toast.error("Erro ao atualizar time: " + error.message);
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
            <CardTitle className="text-3xl font-bold">Editar Time</CardTitle>
            <CardDescription className="text-lg">
              {canEdit ? "Atualize as informações do seu time" : "Visualize as informações do seu time"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!canEdit && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Não é possível editar o time pois o evento já iniciou em {eventDate?.toLocaleDateString('pt-BR')}.
                </AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Logo Preview */}
                <div className="flex flex-col items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Logo do time"
                      className="w-32 h-32 rounded-lg object-cover border-2 border-border"
                    />
                  )}
                  
                  {canEdit && (
                    <div className="w-full">
                      <label className="flex items-center justify-center gap-2 cursor-pointer">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                          id="logo-upload"
                          disabled={!canEdit}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={!canEdit}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Alterar Logo
                        </Button>
                      </label>
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Time *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Tigres Valentes" {...field} disabled={!canEdit} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Conte sobre seu time..." 
                          {...field} 
                          disabled={!canEdit}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="introVideoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Vídeo de Apresentação</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://youtube.com/..." 
                          {...field} 
                          disabled={!canEdit}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Primária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" {...field} disabled={!canEdit} className="w-16 h-10" />
                            <Input {...field} disabled={!canEdit} placeholder="#8B5CF6" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="secondaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cor Secundária</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input type="color" {...field} disabled={!canEdit} className="w-16 h-10" />
                            <Input {...field} disabled={!canEdit} placeholder="#3B82F6" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  {canEdit && (
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  )}
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => navigate("/profile")}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
