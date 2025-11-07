import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Upload } from "lucide-react";

const createTeamSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(50, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  introVideoUrl: z.string().url("URL inválida").optional().or(z.literal("")),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamFormProps {
  onSuccess: () => void;
}

export function CreateTeamForm({ onSuccess }: CreateTeamFormProps) {
  const { user } = useAuth();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      description: "",
      introVideoUrl: "",
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CreateTeamFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!logoFile) {
      toast.error("Logo é obrigatório");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload logo
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("team-logos")
        .upload(fileName, logoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("team-logos")
        .getPublicUrl(fileName);

      // Get current event
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .eq("is_active", true)
        .single();

      if (!events) {
        toast.error("Nenhum evento ativo encontrado");
        return;
      }

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: data.name,
          description: data.description || null,
          intro_video_url: data.introVideoUrl || null,
          logo_url: publicUrl,
          captain_id: user.id,
          event_id: events.id,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      toast.success("Time criado com sucesso!");
      onSuccess();
    } catch (error) {
      console.error("Error creating team:", error);
      toast.error("Erro ao criar time");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
                <FormLabel>Logo do Time *</FormLabel>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Formatos aceitos: PNG, JPG, GIF
                    </p>
                  </div>
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

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Conte um pouco sobre o time..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 500 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="introVideoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vídeo de Introdução (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://youtube.com/watch?v=..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Link do YouTube ou outro serviço de vídeo
                    </FormDescription>
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
  );
}