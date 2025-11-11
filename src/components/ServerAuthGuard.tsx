import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const AUTH_STORAGE_KEY = "ifms_server_authorized";

interface ServerAuthGuardProps {
  children: React.ReactNode;
}

export default function ServerAuthGuard({ children }: ServerAuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuthorization = () => {
      // Não verificar se já estiver na página de autorização
      if (location.pathname === "/server-auth") {
        setIsChecking(false);
        return;
      }

      const isAuthorized = localStorage.getItem(AUTH_STORAGE_KEY) === "true";
      
      if (!isAuthorized) {
        navigate("/server-auth");
      } else {
        setIsChecking(false);
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
