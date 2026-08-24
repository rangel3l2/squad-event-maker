import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, LogOut, UserCircle } from "lucide-react";
import { useJoinRequestsBadge } from "@/hooks/useJoinRequestsBadge";
import { NotificationsBell } from "@/components/NotificationsBell";
import logoAsset from "@/assets/logodeitadoFigurinha.png.asset.json";

const logoCopa = logoAsset.url;

const Navbar = () => {
  const { user, signOut } = useAuth();
  const { count } = useJoinRequestsBadge();

  return (
    <nav className="border-b border-border/50 backdrop-blur-lg bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-4">
          <img 
            src={logoCopa} 
            alt="Frontend Teams Cup Logo" 
            className="h-12 w-auto object-contain animate-fade-in"
          />
          <span className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
            Frontend<br className="md:hidden" /> Teams Cup
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/teams">
                <Button variant="ghost" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Times
                </Button>
              </Link>
              <Link to="/team-details" className="relative">
                <Button variant="ghost" size="sm">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Meu Time
                </Button>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Perfil
                </Button>
              </Link>
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button className="bg-gradient-primary">Entrar</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
