import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, Trophy, LogOut, Settings, Palette, UserCircle } from "lucide-react";
import logoCopaAsset from "@/assets/logo-copa-2026-transp.png.asset.json";

const logoCopa = logoCopaAsset.url;

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="border-b border-border/50 backdrop-blur-lg bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-24 flex items-center justify-between">
        <Link to="/" className="flex items-center justify-center py-3">
          <img 
            src={logoCopa} 
            alt="Frontend Teams Cup - Três Lagoas Logo" 
            className="h-20 w-auto object-contain animate-fade-in"
          />
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
              <Link to="/logo-editor">
                <Button variant="ghost" size="sm">
                  <Palette className="w-4 h-4 mr-2" />
                  Editor de Logos
                </Button>
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
