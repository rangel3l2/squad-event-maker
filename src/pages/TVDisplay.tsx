import { useEffect, useState } from "react";
import { buscarDadosTV, extrairImagens } from "@/services/tvApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock } from "lucide-react";

const TVDisplay = () => {
  const [imagemAtual, setImagemAtual] = useState<string | null>(null);
  const [todasImagens, setTodasImagens] = useState<string[]>([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const CODE_PASTA = "priu_1/40_0";
  const INTERVALO_ROTACAO = 8000; // 8 segundos por imagem
  const INTERVALO_REFRESH = 30000; // 30 segundos para buscar novos dados

  const carregarDados = async () => {
    try {
      const dados = await buscarDadosTV(CODE_PASTA);
      const imagens = extrairImagens(dados);
      
      const listaImagens: string[] = [];
      
      // Adiciona imagem principal (ranking)
      if (imagens.imagemPrincipal) {
        listaImagens.push(imagens.imagemPrincipal);
      }
      
      // Adiciona todas as imagens de pares
      if (imagens.imagensPares.length > 0) {
        listaImagens.push(...imagens.imagensPares);
      }
      
      // Adiciona resultado final se existir
      if (imagens.imagemResultadoFinal) {
        listaImagens.push(imagens.imagemResultadoFinal);
      }
      
      setTodasImagens(listaImagens);
      if (listaImagens.length > 0) {
        setImagemAtual(listaImagens[0]);
      }
      
      setUltimaAtualizacao(imagens.ultimaAtualizacao || new Date().toLocaleString('pt-BR'));
      setLoading(false);
    } catch (error) {
      console.error("Erro ao carregar dados TV:", error);
      setLoading(false);
    }
  };

  // Carrega dados inicialmente
  useEffect(() => {
    carregarDados();
  }, []);

  // Refresh automático dos dados
  useEffect(() => {
    const intervalRefresh = setInterval(() => {
      carregarDados();
    }, INTERVALO_REFRESH);

    return () => clearInterval(intervalRefresh);
  }, []);

  // Rotação automática das imagens
  useEffect(() => {
    if (todasImagens.length <= 1) return;

    const intervalRotacao = setInterval(() => {
      setIndiceAtual((prev) => {
        const novoIndice = (prev + 1) % todasImagens.length;
        setImagemAtual(todasImagens[novoIndice]);
        return novoIndice;
      });
    }, INTERVALO_ROTACAO);

    return () => clearInterval(intervalRotacao);
  }, [todasImagens]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-7xl px-4 space-y-4">
          <Skeleton className="w-full aspect-video" />
          <Skeleton className="h-8 w-64 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="bg-primary/10 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Copa CSS - Classificação em Tempo Real
              </h1>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-5 h-5" />
              <span className="text-sm">
                Última atualização: {ultimaAtualizacao}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Display Principal */}
      <div className="container mx-auto px-6 py-8">
        <div className="relative">
          {/* Indicadores de Página */}
          {todasImagens.length > 1 && (
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {todasImagens.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === indiceAtual
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Imagem Principal */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-border shadow-2xl bg-card">
            {imagemAtual ? (
              <img
                src={imagemAtual}
                alt={`Classificação ${indiceAtual + 1}`}
                className="w-full h-auto object-contain animate-in fade-in duration-500"
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center text-muted-foreground">
                <p className="text-xl">Nenhuma imagem disponível</p>
              </div>
            )}
          </div>

          {/* Footer com Info */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium text-foreground">
                Atualização automática a cada {INTERVALO_REFRESH / 1000}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Animação de transição */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default TVDisplay;
