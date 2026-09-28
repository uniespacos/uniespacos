import { derivarSlotsDoTurno, type SlotDerivado } from '@/lib/utils/derivar-slots-do-turno';
import { ESTILO_SLOT } from '@/constants/situacao-reserva';
import { TURNOS_ORDENADOS, TURNO_LABEL, type Turno } from '@/constants/turnos';
import { cn } from '@/lib/utils';
import { Agenda, AgendaDiasSemanaType, SlotCalendario } from '@/types';
import { useMemo, useState } from 'react';

type StatusPriority = 'indeferida' | 'solicitado' | 'deferida' | 'selecionado' | 'reservado';

function getPriorityValue(status: string): number {
    const priorities: Partial<Record<StatusPriority, number>> = {
        indeferida: 0,
        solicitado: 1,
        deferida: 2,
        selecionado: 2,
        reservado: 3,
    };
    return priorities[status as StatusPriority] ?? 999;
}

interface IndicadorDia {
    temSlot: boolean;
    statusDominante?: string;
}

function calcularIndicadoresDias(
    diasSemana: AgendaDiasSemanaType[],
    agendasPorTurno: Agenda[],
    slotsDaReserva: SlotCalendario[] | undefined,
    isSlotSelecionado: (slot: SlotCalendario) => boolean,
): Map<string, IndicadorDia> {
    const resultado = new Map<string, IndicadorDia>();

    diasSemana.forEach((dia) => {
        const statusDoDia = new Map<string, number>();

        agendasPorTurno.forEach((agenda) => {
            const slotsDia = derivarSlotsDoTurno(agenda, [dia], slotsDaReserva);

            slotsDia.forEach(({ slot }) => {
                const selecionado = isSlotSelecionado(slot);
                const status = selecionado ? 'selecionado' : slot.status;
                const temSlotNaReserva = slotsDaReserva?.some((s) => s.id === slot.id) ?? false;
                const pertenceAReserva = temSlotNaReserva || selecionado;

                if (pertenceAReserva) {
                    const prioridade = getPriorityValue(status);
                    const atual = statusDoDia.get(status) ?? prioridade;
                    statusDoDia.set(status, Math.min(atual, prioridade));
                }
            });
        });

        if (statusDoDia.size === 0) {
            resultado.set(dia.valor, { temSlot: false });
        } else {
            const statusDominante = Array.from(statusDoDia.entries()).sort(
                ([, a], [, b]) => a - b,
            )[0]?.[0];
            resultado.set(dia.valor, { temSlot: true, statusDominante });
        }
    });

    return resultado;
}

interface CalendarDiaMobileProps {
    diasSemana: AgendaDiasSemanaType[];
    agendas: Agenda[];
    isSlotSelecionado: (slot: SlotCalendario) => boolean;
    alternarSelecaoSlot: (slot: SlotCalendario) => void;
    slotsDaReserva?: SlotCalendario[];
    exigirGestor?: boolean;
    modoSelecaoInicial?: 'hoje' | 'primeiroComReserva';
}

function calcularIndiceInicial(
    diasSemana: AgendaDiasSemanaType[],
    modoSelecaoInicial: 'hoje' | 'primeiroComReserva',
    indicadoresDias: Map<string, IndicadorDia>,
): number {
    const indiceHoje = Math.max(diasSemana.findIndex((dia) => dia.ehHoje), 0);

    if (modoSelecaoInicial !== 'primeiroComReserva') {
        return indiceHoje;
    }

    const indicePrimeiroComReserva = diasSemana.findIndex((dia) => indicadoresDias.get(dia.valor)?.temSlot);
    return indicePrimeiroComReserva !== -1 ? indicePrimeiroComReserva : indiceHoje;
}

export default function CalendarDiaMobile({
    diasSemana,
    agendas,
    isSlotSelecionado,
    alternarSelecaoSlot,
    slotsDaReserva,
    exigirGestor = true,
    modoSelecaoInicial = 'hoje',
}: CalendarDiaMobileProps) {
    const agendasOrdenadas = useMemo(
        () =>
            [...agendas].filter((a) => !exigirGestor || a.user).sort((a, b) => TURNOS_ORDENADOS.indexOf(a.turno) - TURNOS_ORDENADOS.indexOf(b.turno)),
        [agendas, exigirGestor],
    );

    const agendasPorTurno = useMemo(() => {
        const mapa = new Map<string, Agenda>();
        agendasOrdenadas.forEach((agenda) => {
            if (!mapa.has(agenda.turno) && (!exigirGestor || agenda.user)) {
                mapa.set(agenda.turno, agenda);
            }
        });
        return Array.from(mapa.values());
    }, [agendasOrdenadas, exigirGestor]);

    const indicadoresDias = useMemo(
        () => calcularIndicadoresDias(diasSemana, agendasPorTurno, slotsDaReserva, isSlotSelecionado),
        [diasSemana, agendasPorTurno, slotsDaReserva, isSlotSelecionado],
    );

    const [indiceDia, setIndiceDia] = useState(() =>
        calcularIndiceInicial(diasSemana, modoSelecaoInicial, indicadoresDias),
    );

    const diaVisivel = diasSemana[indiceDia];

    const slotsPorTurno = useMemo(() => {
        if (diaVisivel === undefined) {
            return [] as { agendaId: number; turno: Turno; slots: SlotDerivado[] }[];
        }

        return agendasPorTurno.map((agenda) => ({
            agendaId: agenda.id,
            turno: agenda.turno,
            slots: derivarSlotsDoTurno(agenda, [diaVisivel], slotsDaReserva),
        }));
    }, [agendasPorTurno, diaVisivel, slotsDaReserva]);

    if (diaVisivel === undefined) {
        return null;
    }

    return (
        <div className="overflow-hidden rounded-xl border">
            <div className="flex border-b" role="tablist" aria-label="Dia da semana">
                {diasSemana.map((dia, indice) => {
                    const ativo = indice === indiceDia;
                    const indicador = indicadoresDias.get(dia.valor);
                    const temSlotNoDia = (indicador?.temSlot) ?? false;
                    const statusDominante = indicador?.statusDominante;
                    const corDoIndicador =
                        statusDominante && (statusDominante in ESTILO_SLOT)
                            ? ESTILO_SLOT[statusDominante as keyof typeof ESTILO_SLOT].solido
                            : '';

                    return (
                        <button
                            key={dia.valor}
                            type="button"
                            role="tab"
                            aria-selected={ativo}
                            aria-label={`${dia.nome}, dia ${dia.diaMes}`}
                            onClick={() => {
                                setIndiceDia(indice);
                            }}
                            className={cn(
                                'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors',
                                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                                'text-muted-foreground',
                                !ativo && 'hover:bg-muted/50',
                            )}
                        >
                            <span className="text-[11px] leading-none font-medium capitalize">{dia.abreviado}</span>
                            <span
                                className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-full text-sm tabular-nums',
                                    ativo && 'bg-muted-foreground/10 ring-2 ring-muted-foreground text-muted-foreground font-semibold',
                                    !ativo && 'font-medium',
                                    !ativo && dia.ehHoje && 'text-primary font-semibold',
                                )}
                            >
                                {dia.diaMes.split('/')[0]}
                            </span>

                            {temSlotNoDia && !ativo && (
                                <span className={cn('absolute bottom-1 h-1 w-1 rounded-full', corDoIndicador)} />
                            )}
                            {dia.ehHoje && !ativo && !temSlotNoDia && (
                                <span className="bg-primary absolute bottom-1 h-1 w-1 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {slotsPorTurno.length === 0 && <p className="text-muted-foreground p-4 text-center text-sm">Nenhum turno disponível neste espaço.</p>}

            {slotsPorTurno.map(({ agendaId, turno, slots }) => (
                <div key={agendaId}>
                    <div className="text-foreground bg-muted/40 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase">
                        {TURNO_LABEL[turno]}
                    </div>

                    {slots.map(({ horaLabel, slot }) => {
                        const selecionado = isSlotSelecionado(slot);
                        const clicavel = slot.status !== 'reservado' && !slot.isLocked && !slot.isPast;
                        const status = selecionado ? 'selecionado' : slot.status;

                        return (
                            <button
                                key={slot.id}
                                type="button"
                                disabled={!clicavel}
                                onClick={
                                    clicavel
                                        ? () => {
                                              alternarSelecaoSlot(slot);
                                          }
                                        : undefined
                                }
                                className={cn(
                                    'flex min-h-[52px] w-full items-center gap-3 border-b px-3 py-2 text-left transition-colors last:border-b-0',
                                    'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                                    clicavel && (status === 'livre' ? 'hover:bg-success-subtle' : 'hover:bg-muted/50'),
                                    slot.isPast && !selecionado && 'bg-muted/60 opacity-90 grayscale',
                                )}
                            >
                                <span className={cn('h-8 w-1 shrink-0 rounded-full', ESTILO_SLOT[status].solido)} aria-hidden />

                                <span className="text-sm font-medium tabular-nums">{horaLabel}</span>

                                <span className="text-muted-foreground ml-auto truncate text-right text-xs">
                                    {(() => {
                                        if (slot.status === 'reservado' && !selecionado) {
                                            return slot.dadosReserva?.reserva_titulo;
                                        }
                                        if (slot.status === 'livre' && slot.isPast && !selecionado) {
                                            return 'Horário encerrado';
                                        }
                                        return ESTILO_SLOT[status].label;
                                    })()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}
