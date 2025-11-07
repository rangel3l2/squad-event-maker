import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PlusCircle } from "lucide-react";
import { CreateTeamForm } from "@/components/teams/CreateTeamForm";
import { JoinTeamForm } from "@/components/teams/JoinTeamForm";

export default function Teams() {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">Frontend Teams Cup</h1>
        
        {mode === "select" && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode("join")}>
              <CardHeader>
                <Users className="w-12 h-12 mb-4 text-primary" />
                <CardTitle>Entrar em um Time</CardTitle>
                <CardDescription>
                  Escolha um time existente e cadastre suas informações para participar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Selecionar</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode("create")}>
              <CardHeader>
                <PlusCircle className="w-12 h-12 mb-4 text-primary" />
                <CardTitle>Criar Novo Time</CardTitle>
                <CardDescription>
                  Crie seu próprio time com logo, nome e informações personalizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Criar Time</Button>
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