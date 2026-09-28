import { useAgendaNavigation } from '@/hooks/use-agenda-navigation';
import { useAgendaSelection } from '@/hooks/use-agenda-selection';
import { cn, diasDaSemana } from '@/lib/utils';
import AgendaEditModeAlert from '@/presentation/molecules/AgendaEditModeAlert';
import AgendaHeader from '@/presentation/molecules/AgendaHeader';
import AgendaNavegacao from '@/presentation/molecules/AgendaNavegacao';
import { ReservaStickySummaryBar } from '@/presentation/molecules/ReservaStickySummaryBar';
import AgendaCalendario from '@/presentation/organisms/AgendaCalendario';
import { ReservaStepperModal } from '@/presentation/organisms/ReservaStepperModal';
import { Espaco, Reserva } from '@/types';
import { parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

interface AgendaEspacoProps {
    isEditMode?: boolean;
    espaco: Espaco;
    reserva?: Reserva;
    semana: { referencia: string };
}

export default function AgendaEspaço({ isEditMode = false, espaco, reserva, semana }: AgendaEspacoProps) {
    const { agendas } = espaco;
    const hoje = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);

    const semanaInicial = useMemo(() => parseISO(semana.referencia), [semana.referencia]);
    const routeName = isEditMode ? 'reservas.edit' : 'espacos.show';
    const routeParams = useMemo(() => (isEditMode ? { reserva: reserva!.id } : { espaco: espaco.id }), [isEditMode, reserva, espaco.id]);

    const { semanaVisivel, isLoading, irParaSemanaAnterior, irParaProximaSemana, irParaSemanaAtual } = useAgendaNavigation({
        semanaInicial,
        routeName,
        routeParams,
    });

    const {
        slotsSelecao,
        alternarSelecaoSlot,
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
        dialogAberto,
        setDialogAberto,
        formData,
        setFormData,
        processing,
        handleFormSubmit,
    } = useAgendaSelection({
        espaco,
        reserva,
        isEditMode,
        semanaVisivel,
    });

    const diasSemana = useMemo(() => diasDaSemana(semanaVisivel, hoje), [semanaVisivel, hoje]);

    const gestoresPorTurno = useMemo(() => {
        const gestores = new Map();
        agendas?.forEach((agenda) => {
            if (agenda.user) {
                gestores.set(agenda.turno, {
                    nome: agenda.user.name,
                    email: agenda.user.email,
                    departamento: agenda.user.setor?.nome ?? 'N/I',
                    agenda_id: agenda.id,
                });
            }
        });
        return gestores;
    }, [agendas]);

    return (
        <div className={cn('container mx-auto max-w-7xl space-y-4 py-4', slotsSelecao.length > 0 && 'pb-32 md:pb-24')}>
            {isEditMode && reserva && <AgendaEditModeAlert reserva={reserva} />}
            <AgendaHeader espaco={espaco} gestoresPorTurno={gestoresPorTurno} />
            <AgendaNavegacao
                semanaAtual={semanaVisivel}
                onAnterior={irParaSemanaAnterior}
                onProxima={irParaProximaSemana}
                onReset={irParaSemanaAtual}
            />

            <div className="relative">
                <AgendaCalendario
                    diasSemana={diasSemana}
                    isSlotSelecionado={isSlotSelecionado}
                    alternarSelecaoSlot={alternarSelecaoSlot}
                    semanaInicio={semanaVisivel}
                    agendas={agendas || []}
                    slotsDaReserva={slotsSelecao}
                    isEditMode={isEditMode}
                />
                {isLoading && (
                    <div className="bg-background/70 absolute inset-0 z-10 flex items-center justify-center rounded-md backdrop-blur-sm">
                        <Loader2 className="text-primary h-8 w-8 animate-spin" />
                    </div>
                )}
            </div>

            {slotsSelecao.length > 0 && (
                <ReservaStickySummaryBar
                    slots={slotsSelecao}
                    onConfirm={() => {
                        setDialogAberto(true);
                    }}
                    onClear={limparSelecao}
                    disabled={processing}
                    isEditMode={isEditMode}
                />
            )}

            <ReservaStepperModal
                isOpen={dialogAberto}
                onOpenChange={setDialogAberto}
                onSubmit={handleFormSubmit}
                slotsSelecao={slotsSelecao}
                hoje={hoje}
                isSubmitting={processing}
                isEditMode={isEditMode}
                espaco={espaco}
                formData={formData}
                setFormData={setFormData}
                setSlotsSelecao={setSlotsSelecao}
            />
        </div>
    );
}
