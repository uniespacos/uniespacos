import { useAgendaNavigation } from '@/hooks/use-agenda-navigation';
import { useAgendaSelection } from '@/hooks/use-agenda-selection';
import { useTranslation } from '@/i18n';
import { cn, diasDaSemana } from '@/lib/utils';
import { capacidadeValida, parseTurnoFiltro } from '@/lib/utils/disponibilidade-filtro';
import AgendaEditModeAlert from '@/presentation/molecules/AgendaEditModeAlert';
import AgendaHeader from '@/presentation/molecules/AgendaHeader';
import AgendaNavegacao from '@/presentation/molecules/AgendaNavegacao';
import { ReservaStickySummaryBar } from '@/presentation/molecules/ReservaStickySummaryBar';
import AgendaCalendario from '@/presentation/organisms/AgendaCalendario';
import { ReservaStepperModal } from '@/presentation/organisms/ReservaStepperModal';
import { Espaco, Reserva } from '@/types';
import { Link } from '@inertiajs/react';
import { parseISO } from 'date-fns';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useMemo } from 'react';

interface AgendaEspacoProps {
    isEditMode?: boolean;
    espaco: Espaco;
    reserva?: Reserva;
    semana: { referencia: string };
}

function extrairContextoUrl(): { semanaUrl?: string; turnoUrl?: string; capacidadeUrl?: string } {
    if (typeof window === 'undefined') {
        return {};
    }
    const params = new URLSearchParams(window.location.search);
    const semanaUrl = params.get('semana') ?? undefined;
    const turnoUrl = params.get('turno') ?? undefined;
    const capacidadeUrl = capacidadeValida(params.get('capacidade') ?? undefined) || undefined;
    return { semanaUrl, turnoUrl, capacidadeUrl };
}

export default function AgendaEspaço({ isEditMode = false, espaco, reserva, semana }: AgendaEspacoProps) {
    const { t } = useTranslation();
    const { agendas } = espaco;
    const hoje = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);

    const { semanaUrl, turnoUrl, capacidadeUrl } = useMemo(() => extrairContextoUrl(), []);
    const turnoDestaque = parseTurnoFiltro(turnoUrl);
    const temContextoBusca = !isEditMode && Boolean(semanaUrl ?? turnoDestaque ?? capacidadeUrl);

    const urlVoltarBusca = useMemo(() => {
        const query = new URLSearchParams();
        if (semanaUrl) query.set('data', semanaUrl);
        if (semanaUrl && turnoDestaque) query.set('turno', turnoDestaque);
        if (capacidadeUrl) query.set('capacidade', capacidadeUrl);
        const qs = query.toString();
        return qs ? `/espacos?${qs}` : '/espacos';
    }, [semanaUrl, turnoDestaque, capacidadeUrl]);

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
        alternarSelecaoIntervalo,
        definirSelecaoDeVarios,
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
        dialogAberto,
        setDialogAberto,
        sucessoCriacao,
        formData,
        setFormData,
        processing,
        handleFormSubmit,
    } = useAgendaSelection({
        espaco,
        reserva,
        isEditMode,
        semanaVisivel,
        initialPublicoEstimado: capacidadeUrl,
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
            {temContextoBusca && (
                <div>
                    <Link
                        href={urlVoltarBusca}
                        className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center gap-1.5 rounded-md text-xs font-medium transition-colors md:min-h-8"
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{t('agenda.voltar_busca')}</span>
                    </Link>
                </div>
            )}
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
                    alternarSelecaoIntervalo={alternarSelecaoIntervalo}
                    definirSelecaoDeVarios={definirSelecaoDeVarios}
                    semanaInicio={semanaVisivel}
                    agendas={agendas || []}
                    slotsDaReserva={slotsSelecao}
                    isEditMode={isEditMode}
                    dataReferencia={semana.referencia}
                    turnoDestaque={turnoDestaque}
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
                sucessoCriacao={sucessoCriacao}
            />
        </div>
    );
}
