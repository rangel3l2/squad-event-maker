import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  logo_url?: string;
  edition?: string;
  is_active: boolean;
}

const AdminEventConfig = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "admin") {
      navigate("/");
      return;
    }
    fetchEvents();
  }, [user, role, navigate]);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: false });

    if (!error && data) {
      setEvents(data);
      if (data.length > 0 && !selectedEvent) {
        setSelectedEvent(data[0]);
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedEvent) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `event-logo-${selectedEvent.id}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("carousel-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("carousel-images")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from("events")
        .update({ logo_url: publicUrl })
        .eq("id", selectedEvent.id);

      if (dbError) throw dbError;

      toast.success("Logo atualizado com sucesso!");
      fetchEvents();
    } catch (error: any) {
      toast.error("Erro ao fazer upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedEvent) return;

    const formData = new FormData(e.currentTarget);
    
    const { error } = await supabase
      .from("events")
      .update({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        edition: formData.get("edition") as string,
        event_date: formData.get("event_date") as string,
      })
      .eq("id", selectedEvent.id);

    if (error) {
      toast.error("Erro ao atualizar evento");
    } else {
      toast.success("Evento atualizado com sucesso!");
      fetchEvents();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Configurar Evento</h1>
            <p className="text-muted-foreground">
              Gerencie nome, logo, edição e informações do evento
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Selecionar Evento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {events.map((event) => (
                  <Button
                    key={event.id}
                    variant={selectedEvent?.id === event.id ? "default" : "outline"}
                    onClick={() => setSelectedEvent(event)}
                  >
                    {event.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedEvent && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Logo do Evento</CardTitle>
                  <CardDescription>
                    Faça upload do logo oficial da copa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedEvent.logo_url && (
                    <div className="flex justify-center">
                      <img
                        src={selectedEvent.logo_url}
                        alt="Logo do evento"
                        className="max-w-xs rounded-lg border"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="logo">Upload do Logo</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="logo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploading}
                      />
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Informações do Evento</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateEvent} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome do Evento</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={selectedEvent.name}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="edition">Edição</Label>
                      <Input
                        id="edition"
                        name="edition"
                        placeholder="Ex: 2024, 1ª Edição, etc."
                        defaultValue={selectedEvent.edition || ""}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        defaultValue={selectedEvent.description || ""}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="event_date">Data e Hora</Label>
                      <Input
                        id="event_date"
                        name="event_date"
                        type="datetime-local"
                        defaultValue={selectedEvent.event_date.slice(0, 16)}
                        required
                      />
                    </div>
                    <Button type="submit">Salvar Alterações</Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEventConfig;
