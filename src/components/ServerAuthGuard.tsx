import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "https://ifms.pro.br:6003";

interface ServerAuthGuardProps {
  children: React.ReactNode;
}

export default function ServerAuthGuard({ children }: ServerAuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      // Não verificar se já estiver na página de autorização
      if (location.pathname === "/server-auth") {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Se conseguiu fazer a requisição, está autorizado
        if (response.ok || response.status === 404 || response.status === 500) {
          setIsChecking(false);
        } else {
          throw new Error("Servidor não autorizado");
        }
      } catch (error) {
        // Se deu erro de SSL/conexão, redirecionar para autorização
        navigate("/server-auth");
      }
    };

    checkAuthorization();
  }, [navigate, location.pathname]);

  if (isChecking && location.pathname !== "/server-auth") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Verificando autorização do servidor...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
