import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ESTILO_SLOT } from '@/constants/situacao-reserva';
import { cn } from '@/lib/utils';
import { CalendarSlotHoverCard } from '@/presentation/molecules/CalendarSlotHoverCard';
import { SituacaoReserva, SlotCalendario } from '@/types';
import { JSX } from 'react';

interface CalendarSlotCellProps {
    slot: SlotCalendario;
    isSelecionado: boolean;
    onSelect: () => void;
}

const FUNDO_STATUS: Record<SlotCalendario['status'], string> = {
    livre: '',
    reservado: 'border-info-accent/30 bg-info-subtle',
    selecionado: 'border-primary bg-primary/15',
    solicitado: 'border-warning-accent/30 bg-warning-subtle',
    deferida: 'border-success-accent/30 bg-success-subtle',
    indeferida: 'border-destructive-accent/30 bg-destructive-subtle',
};

const TEXTO_STATUS: Record<SlotCalendario['status'], string> = {
    livre: '',
    reservado: 'text-info-accent',
    selecionado: 'text-primary',
    solicitado: 'text-warning-accent',
    deferida: 'text-success-accent',
    indeferida: 'text-destructive-accent',
};

export default function CalendarSlotCell({ slot, isSelecionado, onSelect }: CalendarSlotCellProps) {
    const isClickable = slot.status !== 'reservado' && !slot.isLocked && !slot.isPast;

    const renderSlotContent = (): JSX.Element | null => {
        if (slot.isPast && slot.status === 'livre') {
            return null;
        }

        if (isSelecionado) {
            return <p className="text-success-accent text-xs font-bold">{ESTILO_SLOT.selecionado.label}</p>;
        }

        if (slot.status === 'reservado') {
            const horarioDB = slot.dadosReserva?.horarioDB;
            const reserva = horarioDB?.reserva;
            const reservaId = reserva?.id;
            const titulo = slot.dadosReserva?.reserva_titulo ?? reserva?.titulo ?? 'Reserva';
            const solicitanteNome = slot.dadosReserva?.autor ?? reserva?.user?.name ?? 'Solicitante Institucional';
            const solicitanteSetor = reserva?.user?.setor?.sigla ?? reserva?.user?.setor?.nome;
            const situacao: SituacaoReserva = (horarioDB?.situacao as SituacaoReserva | undefined) ?? reserva?.situacao ?? 'deferida';
            const justificativa = horarioDB?.justificativa ?? reserva?.observacao ?? undefined;
            const horarioInicio = slot.horario_inicio.substring(0, 5);
            const horarioFim = slot.horario_fim.substring(0, 5);

            return (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className={cn('w-full cursor-default truncate px-1 text-xs font-bold', TEXTO_STATUS.reservado)}>
                            {titulo.substring(0, 15)}
                            {titulo.length > 15 ? '...' : ''}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="border-none bg-transparent p-0 shadow-none [&>svg]:hidden">
                        <CalendarSlotHoverCard
                            data={{
                                reservaId,
                                titulo,
                                solicitanteNome,
                                solicitanteSetor,
                                horarioInicio,
                                horarioFim,
                                situacao,
                                justificativa,
                            }}
                        />
                    </TooltipContent>
                </Tooltip>
            );
        }

        if (slot.status === 'solicitado' || slot.status === 'deferida' || slot.status === 'indeferida') {
            return <p className={cn('text-xs font-bold', TEXTO_STATUS[slot.status])}>{ESTILO_SLOT[slot.status].label}</p>;
        }

        return null;
    };

    return (
        <div
            key={slot.id}
            onClick={isClickable ? onSelect : undefined}
            className={cn(
                'relative flex h-12 items-center justify-center border-l p-1 text-center transition-all duration-200',
                isSelecionado && 'border-success-accent bg-success-subtle hover:bg-success-subtle/70 shadow-md',

                !isSelecionado && [
                    FUNDO_STATUS[slot.status],
                    {
                        'cursor-not-allowed': slot.status === 'reservado' || slot.isLocked === true || slot.isPast === true,
                        'hover:bg-success-subtle cursor-pointer': slot.status === 'livre' && !slot.isLocked && !slot.isPast,
                        'bg-muted/60 opacity-90 grayscale': slot.isPast,
                    },
                ],
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'absolute inset-y-0 left-0 w-1',
                    isSelecionado && ESTILO_SLOT.selecionado.solido,
                    !isSelecionado && slot.status !== 'livre' && ESTILO_SLOT[slot.status].solido,
                    !isSelecionado && slot.status === 'livre' && slot.isPast && 'bg-muted-foreground/40',
                )}
            />
            {renderSlotContent()}
        </div>
    );
}
