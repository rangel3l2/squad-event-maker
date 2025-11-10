import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, PlusCircle, AlertCircle } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios, mostrarTimeUsuario } from "@/services/api";

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [hasTeam, setHasTeam] = useState(false);
  const [currentTeamName, setCurrentTeamName] = useState<string>("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Verificar se completou o cadastro e se já está em um time
    const checkProfile = async () => {
      try {
        // Verificar perfil completo via API
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          navigate("/complete-profile");
          return;
        }

        // Verificar se já está em um time via API
        try {
          const timeUsuario = await mostrarTimeUsuario(usuario.id!);
          
          if (timeUsuario) {
            setHasTeam(true);
            setCurrentTeamName(timeUsuario.nome_time || "");
          }
        } catch (error) {
          // Usuário não tem time ainda
          setHasTeam(false);
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };

    checkProfile();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Frontend Teams Cup</h1>
        
        {mode === "select" && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <Card className={hasTeam ? "opacity-50" : "hover:shadow-lg transition-shadow cursor-pointer"} onClick={() => !hasTeam && setMode("join")}>
              <CardHeader>
                <Users className="w-12 h-12 mb-4 text-primary" />
                <CardTitle>Entrar em um Time</CardTitle>
                <CardDescription>
                  Escolha um time existente e cadastre suas informações para participar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTeam ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você já está no time "{currentTeamName}". Para entrar em outro time, primeiro saia do seu time atual através do seu perfil.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button className="w-full">Selecionar</Button>
                )}
              </CardContent>
            </Card>

            <Card className={hasTeam ? "opacity-50" : "hover:shadow-lg transition-shadow cursor-pointer"} onClick={() => !hasTeam && setMode("create")}>
              <CardHeader>
                <PlusCircle className="w-12 h-12 mb-4 text-primary" />
                <CardTitle>Criar Novo Time</CardTitle>
                <CardDescription>
                  Crie seu próprio time com logo, nome e informações personalizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasTeam ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Você já está no time "{currentTeamName}". Para criar um novo time, primeiro saia do seu time atual através do seu perfil.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Button className="w-full">Criar Time</Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {mode === "create" && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => setMode("select")} className="mb-4">
              ← Voltar
            </Button>
            <CreateTeamForm onSuccess={() => setMode("select")} />
          </div>
        )}

        {mode === "join" && (
          <div className="max-w-2xl mx-auto">
            <Button variant="outline" onClick={() => setMode("select")} className="mb-4">
              ← Voltar
            </Button>
            <JoinTeamForm onSuccess={() => setMode("select")} />
          </div>
        )}
      </main>
    </div>
  );
}