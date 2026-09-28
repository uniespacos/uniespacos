import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { useIsMobile } from '@/hooks/use-mobile';
import AgendaLegenda from '@/presentation/molecules/AgendaLegenda';
import CalendarDiaMobile from '@/presentation/molecules/CalendarDiaMobile';
import CalendarShiftSection from '@/presentation/molecules/CalendarShiftSection';
import { Agenda, AgendaDiasSemanaType, SlotCalendario } from '@/types';
import { useMemo } from 'react';

interface AgendaCalendarioProps {
    semanaInicio: Date;
    diasSemana: AgendaDiasSemanaType[];
    agendas: Agenda[];
    isSlotSelecionado: (slot: SlotCalendario) => boolean;
    alternarSelecaoSlot: (slot: SlotCalendario) => void;
    slotsDaReserva?: SlotCalendario[];
    isEditMode?: boolean;
}

export default function AgendaCalendario({
    diasSemana,
    agendas,
    isSlotSelecionado,
    alternarSelecaoSlot,
    slotsDaReserva,
    isEditMode,
}: AgendaCalendarioProps) {
    const isMobile = useIsMobile();

    const agendasPorTurno = useMemo(() => {
        const mapa = new Map<string, Agenda>();
        [...agendas]
            .sort((a, b) => TURNOS_ORDENADOS.indexOf(a.turno) - TURNOS_ORDENADOS.indexOf(b.turno))
            .forEach((agenda) => {
                if (!mapa.has(agenda.turno) && agenda.user) {
                    mapa.set(agenda.turno, agenda);
                }
            });
        return Array.from(mapa.values());
    }, [agendas]);

    if (isMobile) {
        return (
            <Card className="gap-0 p-0">
                <AgendaLegenda isEditMode={isEditMode} />
                <CalendarDiaMobile
                    key={diasSemana[0]?.valor}
                    diasSemana={diasSemana}
                    agendas={agendas}
                    isSlotSelecionado={isSlotSelecionado}
                    alternarSelecaoSlot={alternarSelecaoSlot}
                    slotsDaReserva={slotsDaReserva}
                />
            </Card>
        );
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <Card className="gap-0 p-0">
                <AgendaLegenda isEditMode={isEditMode} />
                <div className="w-full overflow-auto">
                    <div className="min-w-[800px] rounded-xl">
                        {agendasPorTurno.map((agenda) => (
                            <CalendarShiftSection
                                key={agenda.id}
                                titulo={agenda.turno}
                                diasSemana={diasSemana}
                                isSlotSelecionado={isSlotSelecionado}
                                alternarSelecaoSlot={alternarSelecaoSlot}
                                agenda={agenda}
                                slotsSolicitados={slotsDaReserva}
                            />
                        ))}
                    </div>
                </div>
            </Card>
        </TooltipProvider>
    );
}
