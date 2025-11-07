import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users, Trophy, LogOut, Settings, Palette } from "lucide-react";

const Navbar = () => {
  const { user, role, signOut } = useAuth();

  return (
    <nav className="border-b border-border/50 backdrop-blur-lg bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl">Squad Maker</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/events">
                <Button variant="ghost" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Eventos
                </Button>
              </Link>
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
              {role === 'admin' && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <Button onClick={signOut} variant="ghost" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth">
                <Button className="bg-gradient-primary">Entrar</Button>
              </Link>
              <Link to="/admin/signup">
                <Button variant="outline" size="sm">Cadastro Admin</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
