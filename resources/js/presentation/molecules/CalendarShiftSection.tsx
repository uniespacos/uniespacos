import { derivarSlotsDoTurno } from '@/lib/utils/derivar-slots-do-turno';
import { cn } from '@/lib/utils';
import CalendarSlotCell from '@/presentation/molecules/CalendarSlotCell';
import { Agenda, AgendaDiasSemanaType, SlotCalendario } from '@/types';
import { useMemo } from 'react';

interface CalendarShiftSectionProps {
    titulo: string;
    agenda: Agenda;
    diasSemana: AgendaDiasSemanaType[];
    isSlotSelecionado?: (slot: SlotCalendario) => boolean;
    alternarSelecaoSlot?: (slot: SlotCalendario) => void;

    slotsSolicitados?: SlotCalendario[];
}

export default function CalendarShiftSection({
    titulo,
    agenda,
    diasSemana,
    isSlotSelecionado,
    alternarSelecaoSlot,
    slotsSolicitados,
}: CalendarShiftSectionProps) {
    const isSlotSelecionadoFn = isSlotSelecionado || (() => false);
    const alternarSelecaoSlotFn = alternarSelecaoSlot || (() => {});

    const derivados = useMemo(() => derivarSlotsDoTurno(agenda, diasSemana, slotsSolicitados), [agenda, diasSemana, slotsSolicitados]);

    const linhasPorHorario = useMemo(() => {
        const linhas = new Map<string, SlotCalendario[]>();
        derivados.forEach(({ horaLabel, slot }) => {
            const linha = linhas.get(horaLabel) ?? [];
            linha.push(slot);
            linhas.set(horaLabel, linha);
        });
        return linhas;
    }, [derivados]);

    return (
        <div key={agenda.id}>
            <div className="bg-muted/50 grid grid-cols-[80px_repeat(7,1fr)] border-b">
                <div className="p-2 text-center text-xs font-semibold">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</div>
                {diasSemana.map((dia) => (
                    <div
                        key={`${titulo}-${dia.valor}`}
                        className={cn('bg-muted/50 border-l p-2 text-center text-xs font-medium', dia.ehHoje && 'bg-primary/5')}
                    >
                        <div className="capitalize">{dia.abreviado}</div>
                        <div className="font-normal">{dia.diaMes.split('/')[0]}</div>
                    </div>
                ))}
            </div>

            {[...linhasPorHorario.entries()].map(([horaLabel, slots]) => (
                <div key={horaLabel} className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
                    <div className="text-muted-foreground border-r p-2 pr-3 text-right text-xs">{horaLabel}</div>

                    {slots.map((slot) => (
                        <CalendarSlotCell
                            key={slot.id}
                            slot={slot}
                            isSelecionado={isSlotSelecionadoFn(slot)}
                            onSelect={() => {
                                alternarSelecaoSlotFn(slot);
                            }}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
