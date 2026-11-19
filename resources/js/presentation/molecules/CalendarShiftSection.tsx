import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { derivarSlotsDoTurno } from '@/lib/utils/derivar-slots-do-turno';
import { slotPodeSerSelecionado } from '@/lib/utils/slot-calendario';
import CalendarSlotCell from '@/presentation/molecules/CalendarSlotCell';
import { Agenda, AgendaDiasSemanaType, SlotCalendario } from '@/types';
import { useCallback, useMemo } from 'react';

interface CalendarShiftSectionProps {
    agenda: Agenda;
    diasSemana: AgendaDiasSemanaType[];
    isSlotSelecionado?: (slot: SlotCalendario) => boolean;
    alternarSelecaoSlot?: (slot: SlotCalendario) => void;
    alternarSelecaoIntervalo?: (slot: SlotCalendario, candidatos: SlotCalendario[]) => void;
    definirSelecaoDeVarios?: (slots: SlotCalendario[], selecionar: boolean) => void;

    slotsSolicitados?: SlotCalendario[];
}

export default function CalendarShiftSection({
    agenda,
    diasSemana,
    isSlotSelecionado,
    alternarSelecaoSlot,
    alternarSelecaoIntervalo,
    definirSelecaoDeVarios,
    slotsSolicitados,
}: CalendarShiftSectionProps) {
    const { t } = useTranslation();
    const isSlotSelecionadoFn = isSlotSelecionado || (() => false);

    const derivados = useMemo(() => derivarSlotsDoTurno(agenda, diasSemana, slotsSolicitados), [agenda, diasSemana, slotsSolicitados]);

    const todosSlotsDoTurno = useMemo(() => derivados.map(({ slot }) => slot), [derivados]);

    const handleSelectSlot = useCallback(
        (slot: SlotCalendario, opcoes: { intervalo: boolean }) => {
            if (opcoes.intervalo && alternarSelecaoIntervalo) {
                alternarSelecaoIntervalo(slot, todosSlotsDoTurno);
                return;
            }
            alternarSelecaoSlot?.(slot);
        },
        [alternarSelecaoSlot, alternarSelecaoIntervalo, todosSlotsDoTurno],
    );

    const linhasPorHorario = useMemo(() => {
        const linhas = new Map<string, SlotCalendario[]>();
        derivados.forEach(({ horaLabel, slot }) => {
            const linha = linhas.get(horaLabel) ?? [];
            linha.push(slot);
            linhas.set(horaLabel, linha);
        });
        return linhas;
    }, [derivados]);

    const slotsPorDia = useMemo(() => {
        const mapa = new Map<string, SlotCalendario[]>();
        derivados.forEach(({ dia, slot }) => {
            const doDia = mapa.get(dia.valor) ?? [];
            doDia.push(slot);
            mapa.set(dia.valor, doDia);
        });
        return mapa;
    }, [derivados]);

    const contextoTurno = t(`agenda.turno.contexto.${agenda.turno}`);

    return (
        <div key={agenda.id}>
            <div className="bg-muted/50 grid grid-cols-[80px_repeat(7,1fr)] border-b">
                <div className="p-2 text-center text-xs font-semibold">{t(`reservas.turnos.${agenda.turno}`)}</div>
                {diasSemana.map((dia) => {
                    const selecionaveis = (slotsPorDia.get(dia.valor) ?? []).filter(slotPodeSerSelecionado);
                    const todosMarcados = selecionaveis.length > 0 && selecionaveis.every((slot) => isSlotSelecionadoFn(slot));
                    const conteudoDia = (
                        <>
                            <div className="capitalize">{dia.abreviado}</div>
                            <div className="font-normal">{dia.diaMes.split('/')[0]}</div>
                        </>
                    );

                    return (
                        <div
                            key={`${agenda.turno}-${dia.valor}`}
                            className={cn(
                                'bg-muted/50 border-l text-center text-xs font-medium',
                                definirSelecaoDeVarios ? 'p-1' : 'p-2',
                                dia.ehHoje && 'bg-primary/5',
                            )}
                        >
                            {definirSelecaoDeVarios ? (
                                <button
                                    type="button"
                                    disabled={selecionaveis.length === 0}
                                    aria-label={
                                        todosMarcados
                                            ? t('agenda.turno.desmarcar_aria', { turno: contextoTurno, dia: dia.nome, data: dia.diaMes })
                                            : t('agenda.turno.marcar_aria', { turno: contextoTurno, dia: dia.nome, data: dia.diaMes })
                                    }
                                    onClick={() => {
                                        definirSelecaoDeVarios(selecionaveis, !todosMarcados);
                                    }}
                                    className={cn(
                                        'flex h-full w-full flex-col items-center gap-1 rounded-md px-1 py-2 transition-colors',
                                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                                        'hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                                    )}
                                >
                                    {conteudoDia}
                                    <span className="text-primary text-xs leading-tight font-semibold">
                                        {t(todosMarcados ? 'agenda.turno.desmarcar_curto' : 'agenda.turno.marcar_curto')}
                                    </span>
                                </button>
                            ) : (
                                conteudoDia
                            )}
                        </div>
                    );
                })}
            </div>

            {[...linhasPorHorario.entries()].map(([horaLabel, slots]) => (
                <div key={horaLabel} className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
                    <div className="text-muted-foreground border-r p-2 pr-3 text-right text-xs">{horaLabel}</div>

                    {slots.map((slot) => (
                        <CalendarSlotCell key={slot.id} slot={slot} isSelecionado={isSlotSelecionadoFn(slot)} onSelectSlot={handleSelectSlot} />
                    ))}
                </div>
            ))}
        </div>
    );
}
