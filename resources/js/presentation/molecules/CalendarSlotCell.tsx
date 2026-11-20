import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ESTILO_SLOT } from '@/constants/situacao-reserva';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { chaveEstadoSlot, descricaoDiaSlot, slotPodeSerSelecionado } from '@/lib/utils/slot-calendario';
import { CalendarSlotHoverCard } from '@/presentation/molecules/CalendarSlotHoverCard';
import { SituacaoReserva, SlotCalendario } from '@/types';
import { memo, useState, type MouseEvent } from 'react';

interface CalendarSlotCellProps {
    slot: SlotCalendario;
    isSelecionado: boolean;
    onSelectSlot?: (slot: SlotCalendario, opcoes: { intervalo: boolean }) => void;
}

function CalendarSlotCell({ slot, isSelecionado, onSelectSlot }: CalendarSlotCellProps) {
    const { t, locale } = useTranslation();
    const [detalheAberto, setDetalheAberto] = useState(false);

    const selecionavel = slotPodeSerSelecionado(slot);
    const estilo = ESTILO_SLOT[isSelecionado ? 'selecionado' : slot.status];
    const faixa = slot.status === 'livre' && !isSelecionado ? (slot.isPast ? 'bg-muted-foreground/40' : '') : estilo.solido;

    const dia = descricaoDiaSlot(slot.data, locale);
    const horario = t('agenda.slot.horario', {
        inicio: slot.horario_inicio.substring(0, 5),
        fim: slot.horario_fim.substring(0, 5),
    });
    const estado = t(chaveEstadoSlot(slot, isSelecionado));

    const classesBase = cn(
        'relative flex h-12 w-full items-center justify-center border-l p-1 text-center transition-colors duration-200 select-none',
        'focus-visible:ring-ring focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
        estilo.fundo,
        estilo.borda,
        slot.isPast && !isSelecionado && 'bg-muted/60 opacity-90 grayscale',
    );

    const renderFaixa = () => <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', faixa)} />;

    if (slot.status === 'reservado' && !isSelecionado) {
        const horarioDB = slot.dadosReserva?.horarioDB;
        const reserva = horarioDB?.reserva;
        const reservaId = reserva?.id;
        const titulo = slot.dadosReserva?.reserva_titulo ?? reserva?.titulo ?? t('agenda.slot.reserva_sem_titulo');
        const solicitanteNome = slot.dadosReserva?.autor ?? reserva?.user?.name ?? t('agenda.slot.solicitante_padrao');
        const solicitanteSetor = reserva?.user?.setor?.sigla ?? reserva?.user?.setor?.nome;
        const situacao: SituacaoReserva = (horarioDB?.situacao as SituacaoReserva | undefined) ?? reserva?.situacao ?? 'deferida';
        const justificativa = horarioDB?.justificativa ?? reserva?.observacao ?? undefined;
        const tituloCurto = `${titulo.substring(0, 15)}${titulo.length > 15 ? '...' : ''}`;

        return (
            <div className={classesBase}>
                {renderFaixa()}
                <Tooltip open={detalheAberto} onOpenChange={setDetalheAberto}>
                    <TooltipTrigger asChild>
                        <span
                            role="group"
                            tabIndex={0}
                            aria-label={t('agenda.slot.aria_label_reservado', {
                                dia,
                                horario,
                                estado: t('agenda.slot.estado.reservado'),
                                titulo,
                            })}
                            onClick={(event) => {
                                event.preventDefault();
                                setDetalheAberto(true);
                            }}
                            className={cn(
                                'w-full cursor-default truncate rounded-sm px-1 text-xs font-bold',
                                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                ESTILO_SLOT.reservado.texto,
                            )}
                        >
                            {tituloCurto}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center" className="border-none bg-transparent p-0 shadow-none [&>svg]:hidden">
                        <CalendarSlotHoverCard
                            data={{
                                reservaId,
                                titulo,
                                solicitanteNome,
                                solicitanteSetor,
                                horarioInicio: slot.horario_inicio.substring(0, 5),
                                horarioFim: slot.horario_fim.substring(0, 5),
                                situacao,
                                justificativa,
                            }}
                        />
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    }

    const renderConteudo = () => {
        if (isSelecionado) {
            return <p className={cn('text-xs font-bold', ESTILO_SLOT.selecionado.texto)}>{estado}</p>;
        }

        if (slot.status === 'livre') {
            return null;
        }

        return <p className={cn('text-xs font-bold', estilo.texto)}>{estado}</p>;
    };

    return (
        <button
            type="button"
            disabled={!selecionavel}
            aria-pressed={selecionavel ? isSelecionado : undefined}
            aria-label={t('agenda.slot.aria_label', { dia, horario, estado })}
            onClick={
                selecionavel
                    ? (event: MouseEvent<HTMLButtonElement>) => {
                          onSelectSlot?.(slot, { intervalo: event.shiftKey });
                      }
                    : undefined
            }
            className={cn(
                classesBase,
                'disabled:cursor-not-allowed',
                selecionavel && (isSelecionado ? 'hover:bg-primary/20 shadow-sm' : 'hover:bg-muted/60 cursor-pointer'),
            )}
        >
            {renderFaixa()}
            {renderConteudo()}
        </button>
    );
}

export default memo(CalendarSlotCell);
