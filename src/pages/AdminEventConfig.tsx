import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";

interface Event {
  id: string;
  name: string;
  description: string;
  event_date: string;
  logo_url?: string;
  edition?: string;
}

// Dados mockados
const mockEvent: Event = {
  id: "1",
  name: "Frontend Teams Cup",
  description: "Competição de desenvolvimento frontend para equipes",
  event_date: "2024-12-15T10:00",
  logo_url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
  edition: "2024",
};

const AdminEventConfig = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event] = useState<Event>(mockEvent);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Configurar Evento</h1>
            <p className="text-muted-foreground">
              Visualização mockada das informações do evento
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Logo do Evento (Mock)</CardTitle>
              <CardDescription>
                Dados simulados para demonstração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.logo_url && (
                <div className="flex justify-center">
                  <img
                    src={event.logo_url}
                    alt="Logo do evento"
                    className="max-w-xs rounded-lg border"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações do Evento (Mock)</CardTitle>
              <CardDescription>
                Apenas visualização - sem edição
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Nome do Evento</Label>
                  <Input value={event.name} readOnly />
                </div>
                <div>
                  <Label>Edição</Label>
                  <Input value={event.edition || ""} readOnly />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={event.description || ""} rows={3} readOnly />
                </div>
                <div>
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={event.event_date} readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminEventConfig;
