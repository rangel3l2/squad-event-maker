import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Loader2 } from "lucide-react";

interface Rule { id: string; title: string; content: string; display_order: number; }

const mockRules: Rule[] = [
  { id: "1", title: "Formação de Times", content: "Cada time deve ter entre 3 e 5 integrantes do mesmo período e turma.", display_order: 0 },
  { id: "2", title: "Tecnologias Permitidas", content: "Permitido uso de React, Vue, Angular ou qualquer framework frontend moderno.", display_order: 1 },
  { id: "3", title: "Critérios de Avaliação", content: "Projetos serão avaliados por design, funcionalidade, código limpo e criatividade.", display_order: 2 },
];

const AdminRules = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useRole();
  const [rules, setRules] = useState<Rule[]>(mockRules);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (!roleLoading && !isAdmin) { toast.error("Acesso negado - privilégios de administrador necessários"); navigate("/"); }
  }, [user, isAdmin, roleLoading, navigate]);

  const handleReorder = (id: string, direction: "up" | "down") => {
    const currentIndex = rules.findIndex(r => r.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const newRules = [...rules];
    [newRules[currentIndex], newRules[targetIndex]] = [newRules[targetIndex], newRules[currentIndex]];
    setRules(newRules);
  };

  const handleDelete = (id: string) => { setRules(rules.filter(r => r.id !== id)); };

  if (roleLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <div><h1 className="text-4xl font-bold mb-2">Gerenciar Regras</h1><p className="text-muted-foreground">Visualização mockada das regras do evento</p></div>
          <Card><CardHeader><CardTitle>Regras do Evento (Mock)</CardTitle><CardDescription>Dados simulados para demonstração</CardDescription></CardHeader><CardContent><div className="space-y-4">{rules.map((rule, index) => (<div key={rule.id} className="flex items-start gap-4 p-4 border rounded-lg"><div className="flex-1"><h3 className="font-semibold mb-2">{rule.title}</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap">{rule.content}</p></div><div className="flex gap-2"><Button variant="ghost" size="icon" onClick={() => handleReorder(rule.id, "up")} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleReorder(rule.id, "down")} disabled={index === rules.length - 1}><ArrowDown className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}><Trash2 className="h-4 w-4" /></Button></div></div>))}</div></CardContent></Card>
        </div>
      </div>
    </div>
  );
};

export default AdminRules;
