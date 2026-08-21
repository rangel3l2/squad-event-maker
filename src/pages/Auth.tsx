import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { listarUsuarios } from "@/services/api";
import { getApiToken, ensureApiToken } from "@/services/apiAuth";
import { toast } from "sonner";
import logoAsset from "@/assets/logodeitadoFigurinha.png.asset.json";

const logoCopa = logoAsset.url;

const safeNext = (value: string | null) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null;

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const requiresReauthentication = params.get("reauth") === "1";
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user) return;

      if (requiresReauthentication) {
        // Wait for the external API token to be re-issued before leaving.
        try {
          if (!getApiToken()) await ensureApiToken(true);
        } catch (error) {
          toast.error("Não foi possível renovar a sessão. Tente entrar novamente.");
          return;
        }
        window.location.href = next ?? "/";
        return;
      }


      if (next) {
        window.location.href = next;
        return;
      }

      try {
        // Verificar se o usuário está cadastrado na API externa
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (usuario) {
          // Usuário já está cadastrado, vai para a página de times
          navigate("/teams");
        } else {
          // Usuário não está cadastrado, precisa completar cadastro
          navigate("/complete-profile");
        }
      } catch (error) {
        console.error("Erro ao verificar cadastro:", error);
        toast.error("Erro ao verificar cadastro");
      }
    };

    if (user) {
      checkUserProfile();
    }
  }, [user, navigate, next, requiresReauthentication]);

  const handleGoogleSignIn = async () => {
    const { error } = await signInWithGoogle(next ?? undefined);
    if (error) {
      toast.error("Erro ao fazer login com Google: " + error.message);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-lg mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold">Frontend Teams Cup</CardTitle>
          <CardDescription>
            {requiresReauthentication
              ? "Sua autorização expirou. Entre novamente para continuar"
              : "Entre com sua conta do Google para continuar"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            onClick={handleGoogleSignIn}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
