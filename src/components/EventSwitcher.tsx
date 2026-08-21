import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVENTO_ATUAL, EVENTO_PADRAO, setEventoAtual } from "@/services/api";

/** Edições conhecidas da Copa. O código 2 é a edição atual (2026). */
const EDICOES = [
  { codigo: 2, label: "Copa 2026 (edição atual)" },
  { codigo: 1, label: "Copa 2025 (edição anterior)" },
];

interface EventSwitcherProps {
  className?: string;
}

/**
 * Permite alternar manualmente a edição (evento) exibida em todo o app.
 * A escolha fica salva no navegador; a página recarrega para aplicar em todas as telas.
 */
export function EventSwitcher({ className }: EventSwitcherProps) {
  const atual = String(EVENTO_ATUAL);
  const opcoes = EDICOES.some((e) => e.codigo === EVENTO_ATUAL)
    ? EDICOES
    : [...EDICOES, { codigo: EVENTO_ATUAL, label: `Edição ${EVENTO_ATUAL}` }];

  const handleChange = (valor: string) => {
    const codigo = Number(valor);
    if (codigo === EVENTO_ATUAL) return;
    setEventoAtual(codigo === EVENTO_PADRAO ? null : codigo);
    window.location.reload();
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={atual} onValueChange={handleChange}>
          <SelectTrigger className="h-9 w-full sm:w-[240px] text-sm">
            <SelectValue placeholder="Edição" />
          </SelectTrigger>
          <SelectContent>
            {opcoes
              .sort((a, b) => b.codigo - a.codigo)
              .map((e) => (
                <SelectItem key={e.codigo} value={String(e.codigo)}>
                  {e.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
