import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface AdminInvite {
  id: string;
  email: string;
  invited_at: string;
  accepted_at: string | null;
}

const AdminInvites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchInvites();
  }, [user, navigate]);

  const fetchInvites = async () => {
    const { data, error } = await supabase
      .from("admin_invites")
      .select("*")
      .order("invited_at", { ascending: false });

    if (!error && data) {
      setInvites(data);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from("admin_invites")
      .insert({ email, invited_by: user!.id });

    if (error) {
      toast.error("Erro ao enviar convite: " + error.message);
    } else {
      toast.success("Convite enviado com sucesso!");
      setEmail("");
      fetchInvites();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("admin_invites")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover convite");
    } else {
      toast.success("Convite removido");
      fetchInvites();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Gerenciar Administradores</h1>
            <p className="text-muted-foreground">
              Convide novos administradores para o sistema
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Convidar Novo Admin</CardTitle>
              <CardDescription>
                Digite o email da pessoa que você deseja adicionar como administrador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={loading}>
                  Enviar Convite
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Convites Enviados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invites.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum convite enviado ainda
                  </p>
                ) : (
                  invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{invite.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {invite.accepted_at
                            ? `Aceito em ${new Date(invite.accepted_at).toLocaleDateString()}`
                            : "Pendente"}
                        </p>
                      </div>
                      {!invite.accepted_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(invite.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminInvites;
