import { ESTILO_SLOT } from '@/constants/situacao-reserva';
import { cn } from '@/lib/utils';

interface AgendaLegendaProps {
    isEditMode?: boolean;
}

const ITEM_LIVRE = { label: 'Disponível para reservar', swatch: 'border border-border bg-background' };
const ITEM_PASSADO = { label: 'Horário encerrado', swatch: 'bg-muted-foreground/40' };

export default function AgendaLegenda({ isEditMode = false }: AgendaLegendaProps) {
    const itens = [
        ITEM_LIVRE,
        ITEM_PASSADO,
        { label: 'Reservado por outra pessoa', swatch: ESTILO_SLOT.reservado.solido },
        { label: 'Selecionado por você', swatch: ESTILO_SLOT.selecionado.solido },
        ...(isEditMode
            ? [
                  { label: 'Solicitado, aguardando avaliação', swatch: ESTILO_SLOT.solicitado.solido },
                  { label: 'Indeferido pelo gestor', swatch: ESTILO_SLOT.indeferida.solido },
              ]
            : []),
    ];

    return (
        <div className="bg-muted/30 grid grid-cols-2 items-center gap-x-4 gap-y-1.5 border-b px-3 py-2 text-xs md:flex md:flex-wrap">
            {itens.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                    <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.swatch)} />
                    <span className="text-muted-foreground">{item.label}</span>
                </div>
            ))}
        </div>
    );
}
