import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { listarUsuarios, mostrarTimeUsuario, type Usuario, type Time } from "@/services/api";

export default function TeamDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState<Time | null>(null);
  const [integrantes, setIntegrantes] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTeamData = async () => {
      if (!user) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }

      try {
        // Buscar usuário na API
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          toast.error("Complete seu perfil primeiro");
          navigate("/complete-profile");
          return;
        }

        // Buscar time do usuário
        const timeUsuario = await mostrarTimeUsuario(usuario.id!);
        setTime(timeUsuario);

        // Buscar dados dos integrantes
        if (timeUsuario.integrantes && timeUsuario.integrantes.length > 0) {
          const integrantesIds = timeUsuario.integrantes.map((i: any) => i.usuario_id);
          const integrantesData = usuarios.filter(u => integrantesIds.includes(u.id));
          setIntegrantes(integrantesData);
        }
      } catch (error: any) {
        console.error("Erro ao carregar dados do time:", error);
        toast.error("Erro ao carregar dados do time");
        navigate("/teams");
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!time) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">Você não está em nenhum time</p>
          <Button onClick={() => navigate("/teams")}>
            Voltar para Times
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/teams")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Logo e Nome do Time */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4">
              {time.imagem_time && (
                <img
                  src={time.imagem_time}
                  alt={`Logo ${time.nome_time}`}
                  className="w-48 h-48 object-contain rounded-lg"
                />
              )}
              <CardTitle className="text-3xl">{time.nome_time}</CardTitle>
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Integrantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Integrantes ({integrantes.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrantes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum integrante ainda
                </p>
              ) : (
                integrantes.map((integrante) => (
                  <div
                    key={integrante.id}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={integrante.url_image_perfil || undefined} />
                      <AvatarFallback>
                        {integrante.nome.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{integrante.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Turma {integrante.turma} - Período {integrante.periodo}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
