import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { listarUsuarios, mostrarTimeUsuario, mostrarTime, removerIntegrante, deletarTime, type Usuario, type Time } from "@/services/api";

export default function TeamDetails() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [time, setTime] = useState<Time | null>(null);
  const [integrantes, setIntegrantes] = useState<Usuario[]>([]);
  const [integrantesComFuncao, setIntegrantesComFuncao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUserInTeam, setIsUserInTeam] = useState(false);

  useEffect(() => {
    const loadTeamData = async () => {
      if (!user) {
        toast.error("Você precisa estar logado");
        navigate("/auth");
        return;
      }

      try {
        // Buscar usuário na API
        const usuarios = await listarUsuarios();
        const usuario = usuarios.find(u => u.email === user.email);

        if (!usuario) {
          toast.error("Complete seu perfil primeiro");
          navigate("/complete-profile");
          return;
        }

        let timeData: Time;
        
        // Se tem teamId na URL, busca esse time específico
        if (teamId) {
          console.log("=== BUSCANDO TIME POR ID ===");
          console.log("Team ID:", teamId);
          timeData = await mostrarTime(Number(teamId));
          console.log("Time encontrado:", timeData);
          console.log("Integrantes no time:", timeData.integrantes);
        } else {
          // Senão, busca o time do usuário logado
          console.log("=== BUSCANDO TIME DO USUÁRIO ===");
          console.log("Usuario ID:", usuario.id);
          timeData = await mostrarTimeUsuario(usuario.id!);
          console.log("Time do usuário:", timeData);
          console.log("Integrantes no time:", timeData.integrantes);
        }
        
        setTime(timeData);
        
        console.log("=== PROCESSANDO INTEGRANTES ===");
        console.log("timeData.integrantes:", timeData.integrantes);

        // Determinar contagem de integrantes (API pode retornar em campos diferentes)
        const countApi = Number(
          (timeData as any).qtd_integrantes ?? (timeData as any).quantidade ?? (timeData.integrantes?.length || 0)
        ) || 0;

        // Preparar lista de integrantes com fallback para buscar detalhes se necessário
        let integrantesLista: any[] = Array.isArray(timeData.integrantes) ? timeData.integrantes : [];

        if (integrantesLista.length === 0 && countApi > 0 && timeData.id) {
          console.log("Integrantes vazio, mas contagem > 0. Buscando detalhes do time por ID...");
          try {
            const detalhe = await mostrarTime(timeData.id);
            integrantesLista = Array.isArray(detalhe.integrantes) ? detalhe.integrantes : [];
            console.log("Integrantes obtidos via fallback:", integrantesLista);
          } catch (e) {
            console.warn("Falha ao buscar detalhes do time:", e);
          }
        }
        
        if (integrantesLista.length > 0) {
          setIntegrantesComFuncao(integrantesLista);

          const integrantesIds = integrantesLista.map((i: any) => i.usuario_id ?? i.id);
          console.log("IDs dos integrantes:", integrantesIds);

          const integrantesData = usuarios.filter(u => integrantesIds.includes(u.id));
          console.log("Dados dos integrantes encontrados:", integrantesData);

          setIntegrantes(integrantesData);

          // Verificar se o usuário logado está neste time
          if (teamId) {
            const usuarioEstaNoTime = integrantesIds.includes(usuario.id);
            setIsUserInTeam(usuarioEstaNoTime);
            console.log("Usuário está neste time?", usuarioEstaNoTime);
          } else {
            // Quando é o time do usuário, já sabemos que ele pertence ao time
            setIsUserInTeam(true);
          }
        } else {
          console.log("Lista de integrantes vazia ou undefined");
          setIntegrantes([]);
          setIntegrantesComFuncao([]);
          // Se estivermos na visualização do próprio time, mantém true
          setIsUserInTeam(!teamId);
        }
        
        console.log("=== DADOS DO TIME ===");
        console.log("time.qtd_integrantes:", (timeData as any).qtd_integrantes);
        console.log("time.quantidade:", (timeData as any).quantidade);
        console.log("integrantes no array:", integrantesLista.length || 0);
      } catch (error: any) {
        console.error("Erro ao carregar dados do time:", error);
        toast.error("Erro ao carregar dados do time");
        navigate("/teams");
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user, navigate, teamId]);

  const handleLeaveTeam = async () => {
    if (!user || !time) return;

    try {
      setIsLeaving(true);
      
      // Buscar usuário na API
      const usuarios = await listarUsuarios();
      const usuario = usuarios.find(u => u.email === user.email);

      if (!usuario?.id) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Verificar se o usuário é o líder
      const integranteAtual = integrantesComFuncao.find(
        (i: any) => (i.usuario_id ?? i.id) === usuario.id
      );

      console.log("=== SAINDO DO TIME ===");
      console.log("Usuário:", usuario);
      console.log("Time ID:", time.id);
      console.log("Função do usuário:", integranteAtual?.funcao);

      if (integranteAtual?.funcao === "Líder") {
        // Se for líder, deletar o time inteiro
        console.log("Usuário é líder. Deletando time...");
        await deletarTime(time.id!);
        console.log("Time deletado com sucesso!");
        toast.success("Time deletado com sucesso!");
      } else {
        // Se não for líder, apenas remover o integrante
        console.log("Usuário é membro. Removendo do time...");
        await removerIntegrante(time.id!, usuario.id);
        console.log("Integrante removido com sucesso!");
        toast.success("Você saiu do time!");
      }

      navigate("/teams");
    } catch (error: any) {
      console.error("Erro ao sair do time:", error);
      toast.error("Erro ao sair do time: " + error.message);
    } finally {
      setIsLeaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!time) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">Você não está em nenhum time</p>
          <Button onClick={() => navigate("/teams")}>
            Voltar para Times
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/teams")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Logo e Nome do Time */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex flex-col items-center gap-4">
              {time.imagem_time && (
                <img
                  src={time.imagem_time}
                  alt={`Logo ${time.nome_time}`}
                  className="w-48 h-48 object-contain rounded-lg"
                />
              )}
              <CardTitle className="text-3xl">{time.nome_time}</CardTitle>
              
              {isUserInTeam && (
                <Button 
                  variant="destructive" 
                  onClick={handleLeaveTeam}
                  disabled={isLeaving}
                >
                  {isLeaving ? "Saindo..." : "Sair do Time"}
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Lista de Integrantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Integrantes ({time.qtd_integrantes || time.quantidade || integrantes.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {integrantes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum integrante ainda
                </p>
              ) : (
                integrantes.map((integrante) => {
                  const integranteComFuncao = integrantesComFuncao.find(
                    (i: any) => (i.usuario_id ?? i.id) === integrante.id
                  );
                  const funcao = integranteComFuncao?.funcao || "Membro";
                  
                  return (
                    <div
                      key={integrante.id}
                      className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={integrante.url_image_perfil || undefined} />
                        <AvatarFallback>
                          {integrante.nome.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{integrante.nome}</p>
                          {funcao === "Líder" && (
                            <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                              {funcao}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Turma {integrante.turma} - Período {integrante.periodo}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
