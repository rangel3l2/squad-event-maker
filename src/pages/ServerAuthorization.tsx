import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "https://ifms.pro.br:6005";
const AUTH_STORAGE_KEY = "ifms_server_authorized";

export default function ServerAuthorization() {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Tentar verificar conexão automaticamente
    checkServerConnection(true);
  }, []);

  const checkServerConnection = async (silent = false) => {
    setIsChecking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        setIsAuthorized(true);
        if (!silent) {
          toast.success("Servidor autorizado com sucesso!");
        }
        setTimeout(() => {
          navigate("/");
        }, silent ? 0 : 1500);
      } else {
        throw new Error("Servidor não respondeu corretamente");
      }
    } catch (error) {
      if (!silent) {
        toast.error("Não foi possível conectar ao servidor. Por favor, autorize o certificado primeiro.");
      }
      setIsAuthorized(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAuthorize = () => {
    // Abrir URL da API em nova aba para autorizar certificado
    window.open(API_BASE_URL, '_blank');
    
    toast.info("Após autorizar o certificado na nova aba, volte aqui e a página recarregará automaticamente");
    
    // Verificar periodicamente se a autorização foi feita
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
          clearInterval(intervalId);
          setIsAuthorized(true);
          toast.success("Servidor autorizado com sucesso!");
          setTimeout(() => {
            navigate("/");
          }, 1500);
        }
      } catch (error) {
        // Ainda não autorizado, continuar verificando
      }
    }, 2000);

    // Limpar intervalo após 2 minutos
    setTimeout(() => clearInterval(intervalId), 120000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Autorização do Servidor
          </CardTitle>
          <CardDescription className="text-base">
            Antes de começar, você precisa autorizar o acesso ao servidor da aplicação
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Este sistema utiliza um servidor hospedado dentro do campus 
              IFMS Três Lagoas. Devido ao certificado SSL auto-assinado, você precisará autorizar 
              o acesso manualmente no navegador antes de usar a aplicação.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-lg">Como autorizar o servidor:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Clique no botão "Autorizar Servidor" abaixo</li>
                <li>Uma nova aba será aberta com a URL do servidor</li>
                <li>Você verá um aviso de segurança do navegador</li>
                <li>Clique em "Avançado" ou "Advanced"</li>
                <li>Clique em "Prosseguir para ifms.pro.br" ou "Proceed to ifms.pro.br"</li>
                <li>Volte para esta aba e aguarde - a verificação será automática</li>
              </ol>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleAuthorize}
                size="lg"
                className="w-full"
                disabled={isAuthorized}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Autorizar Servidor
              </Button>

              {!isAuthorized && (
                <Button 
                  onClick={() => checkServerConnection(false)}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                  disabled={isChecking}
                >
                  {isChecking ? (
                    <>Verificando...</>
                  ) : (
                    <>Verificar Conexão Manualmente</>
                  )}
                </Button>
              )}
            </div>
          </div>

          {isAuthorized && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Servidor autorizado com sucesso! Redirecionando...
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Servidor: <code className="bg-muted px-2 py-1 rounded">{API_BASE_URL}</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
