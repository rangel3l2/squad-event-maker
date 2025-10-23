import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Palette, Shield } from "lucide-react";
import Navbar from "@/components/Navbar";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/events");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-20 pb-32 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 backdrop-blur">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-semibold">Sistema de Gestão de Times</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Crie Times{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Incríveis
              </span>
              <br />
              para Seus Eventos
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Plataforma completa para organizar eventos escolares, formar equipes personalizadas
              e gerenciar participantes de forma simples e eficiente.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8"
                onClick={() => navigate("/auth")}
              >
                <Users className="w-5 h-5 mr-2" />
                Começar Agora
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 pb-20">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Times Flexíveis</h3>
              <p className="text-muted-foreground">
                Crie times misturando alunos de diferentes salas e grupos
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Personalização Total</h3>
              <p className="text-muted-foreground">
                Logo customizado e cores personalizadas para cada time
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-card border border-border/50 shadow-card backdrop-blur">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gestão Completa</h3>
              <p className="text-muted-foreground">
                Admins e capitães gerenciam membros com total controle
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Index;
