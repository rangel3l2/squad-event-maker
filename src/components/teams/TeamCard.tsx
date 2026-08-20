import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import type { Time, Usuario } from "@/services/api";

interface TeamCardProps {
  time: Time;
  usuarios?: Usuario[];
  isCurrent?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

export const getMembrosDoTime = (time: Time, usuarios: Usuario[] = []): Usuario[] => {
  const integrantes = Array.isArray(time.integrantes) ? (time.integrantes as any[]) : [];
  const ids = integrantes.map((i: any) => i.usuario_id ?? i.id);
  if (time.dono_id != null && !ids.includes(time.dono_id)) ids.unshift(time.dono_id);

  return ids
    .map((id) => {
      const found = usuarios.find((u) => Number(u.id) === Number(id));
      if (found) return found;
      const inline = integrantes.find(
        (i: any) => Number(i.usuario_id ?? i.id) === Number(id)
      );
      if (inline && (inline.nome || inline.url_image_perfil)) {
        return {
          id,
          nome: inline.nome ?? "",
          url_image_perfil: inline.url_image_perfil,
        } as Usuario;
      }
      return null;
    })
    .filter((u): u is Usuario => !!u);
};

export const TeamCard = ({
  time,
  usuarios = [],
  isCurrent = false,
  compact = false,
  onClick,
}: TeamCardProps) => {
  const cor = time.cor_time || time.cor_base || "hsl(var(--primary))";
  const membros = getMembrosDoTime(time, usuarios);
  const totalMembros = time.qtd_integrantes ?? (time as any).quantidade ?? membros.length ?? 0;

  return (
    <Card
      className={`overflow-hidden transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] ${
        isCurrent ? "ring-2 ring-primary/40" : ""
      }`}
      style={{
        backgroundImage: `linear-gradient(135deg, ${cor}15 0%, transparent 55%)`,
        borderColor: `${cor}40`,
      }}
      onClick={onClick}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: cor }} />
      <CardContent className={`flex items-center gap-3 ${compact ? "py-3 px-3" : "py-5 px-4"}`}>
        {time.imagem_time ? (
          <div className="relative flex-shrink-0">
            <div
              className="absolute inset-0 rounded-lg blur-sm opacity-40"
              style={{ backgroundColor: cor }}
            />
            <img
              src={time.imagem_time}
              alt={`Bandeira ${time.nome_time}`}
              className={`relative object-contain rounded-lg flex-shrink-0 bg-card/80 border border-white/10 ${
                compact ? "w-10 h-10" : "w-14 h-14"
              }`}
            />
          </div>
        ) : (
          <div
            className={`flex-shrink-0 rounded-lg flex items-center justify-center bg-muted ${
              compact ? "w-10 h-10" : "w-14 h-14"
            }`}
          >
            <Users className={`text-muted-foreground ${compact ? "w-5 h-5" : "w-7 h-7"}`} />
          </div>
        )}

        <div className="flex-1 min-w-0 text-left">
          <p className={`font-bold truncate ${compact ? "text-sm" : "text-base"}`}>
            {time.nome_time}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalMembros}/4
          </p>
          {!isCurrent && time.evento != null && (
            <p className="text-xs text-muted-foreground">Edição {time.evento}</p>
          )}
        </div>

        <div className="flex flex-nowrap -space-x-1.5 overflow-hidden pl-1">
          {membros.slice(0, 4).map((m, idx) => (
            <Avatar
              key={idx}
              className={`inline-block ring-2 ring-background ${compact ? "w-5 h-5" : "w-6 h-6"}`}
            >
              <AvatarImage src={m.url_image_perfil} alt="" />
              <AvatarFallback className="text-[7px] bg-muted">
                {m.nome?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
          ))}
          {membros.length > 4 && (
            <div
              className={`flex items-center justify-center rounded-full bg-muted ring-2 ring-background text-[7px] font-medium ${
                compact ? "w-5 h-5" : "w-6 h-6"
              }`}
            >
              +{membros.length - 4}
            </div>
          )}
          {membros.length === 0 && totalMembros > 0 && (
            <span className="text-[10px] text-muted-foreground">{totalMembros} membro(s)</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
