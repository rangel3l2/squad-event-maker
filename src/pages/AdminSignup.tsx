import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import { Shield } from "lucide-react";

const adminSignupSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter no mínimo 6 caracteres" }),
  fullName: z.string().min(3, { message: "Nome deve ter no mínimo 3 caracteres" }),
});

const AdminSignup = () => {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      checkAdminRequest();
    }
  }, [user]);

  const checkAdminRequest = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('admin_requests')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setRequestStatus(data.status);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    const result = adminSignupSchema.safeParse({ email, password, fullName });
    
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(email, password, fullName);

    if (signUpError) {
      toast.error(signUpError.message);
      setIsLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    
    if (userData.user) {
      const { error: requestError } = await supabase
        .from('admin_requests')
        .insert({
          user_id: userData.user.id,
          email: email,
          full_name: fullName,
        });

      if (requestError) {
        toast.error("Erro ao criar solicitação de administrador");
      } else {
        toast.success("Solicitação enviada! Aguarde aprovação por email.");
        setRequestStatus('pending');
      }
    }

    setIsLoading(false);
  };

  if (requestStatus === 'pending') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Solicitação Pendente</CardTitle>
              <CardDescription>
                Sua solicitação para se tornar administrador está sendo analisada. 
                Você receberá um email quando for aprovado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/")} className="w-full">
                Voltar para Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  if (user && requestStatus !== 'pending') {
    navigate("/");
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <CardTitle>Cadastro de Administrador</CardTitle>
            <CardDescription>
              Solicite acesso como administrador do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Seu nome completo"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando solicitação..." : "Solicitar Acesso"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
                disabled={isLoading}
              >
                Voltar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AdminSignup;
