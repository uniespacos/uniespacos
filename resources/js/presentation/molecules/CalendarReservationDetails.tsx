import { Card } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import CalendarDiaMobile from '@/presentation/molecules/CalendarDiaMobile';
import CalendarShiftSection from '@/presentation/molecules/CalendarShiftSection';
import { Agenda, AgendaDiasSemanaType, SlotCalendario } from '@/types';

interface CalendarReservationDetailsProps {
    diasSemana: AgendaDiasSemanaType[];
    agendas: Agenda[];
    slotsSolicitados: SlotCalendario[];
    alternarSelecaoSlot?: (slot: SlotCalendario) => void;
}

const SEM_SELECAO = () => false;

export default function CalendarReservationDetails({ diasSemana, agendas, slotsSolicitados, alternarSelecaoSlot }: CalendarReservationDetailsProps) {
    const alternarSelecaoSlotFn = alternarSelecaoSlot ?? (() => {});
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Card className="p-0">
                <CalendarDiaMobile
                    key={diasSemana[0]?.valor}
                    diasSemana={diasSemana}
                    agendas={agendas}
                    isSlotSelecionado={SEM_SELECAO}
                    alternarSelecaoSlot={alternarSelecaoSlotFn}
                    slotsDaReserva={slotsSolicitados}
                    exigirGestor={false}
                    modoSelecaoInicial="primeiroComReserva"
                />
            </Card>
        );
    }

    return (
        <TooltipProvider delayDuration={200} skipDelayDuration={100}>
            <Card className="p-0">
                <div className="w-full overflow-auto">
                    <div className="min-w-[800px] rounded-xl">
                        <div className="bg-background sticky grid grid-cols-[80px_repeat(7,1fr)] border-b">
                            <div className="text-muted-foreground text-center text-sm font-medium"></div>

                        </div>
                        {agendas.map((agenda) => (
                            <CalendarShiftSection
                                key={agenda.id}
                                titulo={agenda.turno}
                                agenda={agenda}
                                diasSemana={diasSemana}
                                slotsSolicitados={slotsSolicitados}
                                alternarSelecaoSlot={alternarSelecaoSlotFn}
                            />
                        ))}
                    </div>
                </div>
            </Card>
        </TooltipProvider>
    );
}
