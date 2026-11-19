import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { EscopoRecorrencia, isDecisaoAvaliacao, SituacaoReserva, ValidationStatus, type SituacaoReservaType } from '@/contracts';
import { useAgendaNavigation } from '@/hooks/use-agenda-navigation';
import { useAvaliarReserva } from '@/hooks/use-avaliar-reserva';
import { useReservaRefreshOnEvent } from '@/hooks/use-reserva-refresh-on-event';
import { useReservationLiveUpdates } from '@/hooks/use-reservation-live-updates';
import { useReservationSlots } from '@/hooks/use-reservation-slots';
import { useTranslation } from '@/i18n';
import { diasDaSemana, getStatusReservaColor, getStatusReservaText, parseDataLocal } from '@/lib/utils';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { verificarStatusReserva } from '@/lib/utils/reserva-status.helpers';
import { SituacaoIcon } from '@/presentation/atoms/SituacaoIcon';
import AgendaNavegacao from '@/presentation/molecules/AgendaNavegacao';
import CalendarReservationDetails from '@/presentation/molecules/CalendarReservationDetails';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { ConflictAlertBox } from '@/presentation/organisms/ConflictAlertBox';
import { ConflictCacheSnapshotPanel } from '@/presentation/organisms/ConflictCacheSnapshotPanel';
import EvaluationForm from '@/presentation/organisms/EvaluationForm';
import { ReservaInfoCard } from '@/presentation/organisms/ReservaInfoCard';
import AppLayout from '@/presentation/templates/AppLayout';
import { Agenda, Reserva, type BreadcrumbItem, type ConflictInfo, type SlotCalendario } from '@/types';
import { Head, router } from '@inertiajs/react';
import { endOfWeek, format, parse, parseISO, startOfWeek } from 'date-fns';
import { ArrowLeft, Clock, Info, Loader2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gerenciar Reservas',
        href: '/gestor/reservas',
    },
    {
        title: 'Avaliar Reserva',
        href: '#',
    },
];

interface AvaliarReservaPageProps {
    reserva: Reserva;
    semana: {
        inicio?: string;
        fim?: string;
        referencia: string;
    };
    todosOsConflitos?: Record<string, ConflictInfo>;
    conflictCacheSnapshot?: Record<string, ConflictInfo> | null;
}

export default function AvaliarReservaPage({ reserva, semana, todosOsConflitos = {}, conflictCacheSnapshot = null }: AvaliarReservaPageProps) {
    const { t } = useTranslation();
    useReservationLiveUpdates();
    useReservaRefreshOnEvent({ only: ['reserva'] });

    const isCancelada = reserva.situacao === SituacaoReserva.INATIVA;
    const isReavaliacao = reserva.situacao !== SituacaoReserva.EM_ANALISE;

    const agendas = useMemo(() => {
        return reserva.horarios
            .map((horario) => horario.agenda)
            .filter((agenda): agenda is Agenda => agenda !== undefined)
            .reduce((acc: Agenda[], agenda) => (acc.find((item) => item.id === agenda.id) ? acc : [...acc, agenda]), [])
            .sort((a, b) => TURNOS_ORDENADOS.indexOf(a.turno) - TURNOS_ORDENADOS.indexOf(b.turno));
    }, [reserva.horarios]);

    const hoje = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);

    const { slotsSelecao, avaliarSlot, handleDecisaoGlobalChange, restaurarSlotsForaDoEscopo } = useReservationSlots(reserva);

    const { form, submitEvaluation } = useAvaliarReserva({
        reserva,
    });
    const { setData } = form;

    const semanaInicial = useMemo(() => parseISO(semana.referencia), [semana.referencia]);
    const dataInicialReserva = useMemo(() => parseDataLocal(reserva.data_inicial), [reserva.data_inicial]);
    const dataFinalReserva = useMemo(() => parseDataLocal(reserva.data_final), [reserva.data_final]);

    const { semanaVisivel, isLoading, podeVoltar, podeAvancar, irParaSemanaAnterior, irParaProximaSemana } = useAgendaNavigation({
        semanaInicial,
        routeName: 'gestor.reservas.show',
        routeParams: useMemo(() => ({ reserva: reserva.id }), [reserva.id]),
        dataInicial: dataInicialReserva,
        dataFinal: dataFinalReserva,
        only: useMemo(() => ['reserva', 'semana', 'todosOsConflitos'], []),
    });

    const inicioSemanaIso = useMemo(() => format(startOfWeek(semanaVisivel, { weekStartsOn: 1 }), 'yyyy-MM-dd'), [semanaVisivel]);
    const fimSemanaIso = useMemo(() => format(endOfWeek(semanaVisivel, { weekStartsOn: 1 }), 'yyyy-MM-dd'), [semanaVisivel]);

    const slotPertenceASemanaVisivel = useCallback(
        (slot: SlotCalendario) => {
            const dataSlot = slot.dadosReserva?.horarioDB.data ?? format(slot.data, 'yyyy-MM-dd');
            return dataSlot >= inicioSemanaIso && dataSlot <= fimSemanaIso;
        },
        [inicioSemanaIso, fimSemanaIso],
    );

    const slotsDoEscopo = useMemo(
        () => (form.data.evaluation_scope === EscopoRecorrencia.SINGLE ? slotsSelecao.filter(slotPertenceASemanaVisivel) : slotsSelecao),
        [form.data.evaluation_scope, slotsSelecao, slotPertenceASemanaVisivel],
    );

    useEffect(() => {
        if (form.data.evaluation_scope === EscopoRecorrencia.SINGLE) {
            restaurarSlotsForaDoEscopo(slotPertenceASemanaVisivel);
        }
    }, [form.data.evaluation_scope, restaurarSlotsForaDoEscopo, slotPertenceASemanaVisivel]);

    useEffect(() => {
        const conflitos = Object.values(todosOsConflitos);

        if (conflitos.length > 0) {
            const horariosOriginaisMap = new Map(reserva.horarios.map((h) => [h.id, h]));

            const motivoConflitos = conflitos
                .map((conflito) => {
                    const horarioOriginal = horariosOriginaisMap.get(conflito.horario_checado_id);
                    if (!horarioOriginal) return null;

                    const horarioFormatado = horarioOriginal.horario_inicio.substring(0, 5);
                    const dataFormatada = format(parse(horarioOriginal.data, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy');
                    const detalheDoConflito = t('reservas.conflito_outra_reserva_deferida');

                    return `- Horário das ${horarioFormatado} do dia ${dataFormatada}: Indeferido. ${detalheDoConflito}`;
                })
                .filter(Boolean)
                .join('\n');

            setData('motivo', motivoConflitos);
        }
    }, [setData, reserva.horarios, todosOsConflitos, t]);

    useEffect(() => {
        const horariosParaEnviar = slotsDoEscopo.flatMap((slot) => {
            const id = slot.dadosReserva?.horarioDB.id;
            return id !== undefined ? [{ id, status: slot.status }] : [];
        });

        setData((prevData) => ({
            ...prevData,
            situacao: verificarStatusReserva(slotsDoEscopo),
            horarios_avaliados: horariosParaEnviar,
        }));
    }, [setData, slotsDoEscopo]);

    const [decisao, setDecisao] = useState<SituacaoReservaType>(reserva.situacao);

    const isRadioGroupDisabled = useMemo(() => {
        const statusUnicos = new Set(slotsDoEscopo.filter((slot) => !slot.isLocked).map((slot) => slot.status));
        return statusUnicos.size > 1;
    }, [slotsDoEscopo]);

    useEffect(() => {
        const slotsAvaliáveis = slotsDoEscopo.filter((slot) => !slot.isLocked);
        if (slotsAvaliáveis.length > 0) {
            const primeiroStatus = slotsAvaliáveis[0].status;
            const todosComMesmoStatus = slotsAvaliáveis.every((s) => s.status === primeiroStatus);
            setDecisao(todosComMesmoStatus ? (primeiroStatus as SituacaoReservaType) : SituacaoReserva.EM_ANALISE);
        } else {
            setDecisao(SituacaoReserva.EM_ANALISE);
        }
    }, [slotsDoEscopo]);

    const handleSubmit = (e: React.SyntheticEvent) => {
        submitEvaluation(e);
    };

    const handleDecisaoChange = (novaDecisao: SituacaoReservaType) => {
        setDecisao(novaDecisao);
        if (isDecisaoAvaliacao(novaDecisao)) {
            handleDecisaoGlobalChange(novaDecisao, form.data.evaluation_scope === EscopoRecorrencia.SINGLE ? slotPertenceASemanaVisivel : undefined);
        }
    };

    const situacaoHeader = isCancelada ? SituacaoReserva.INATIVA : verificarStatusReserva(slotsSelecao);

    const tituloAvaliacao = isCancelada
        ? t('reservas.detalhes.titulo')
        : isReavaliacao
          ? t('reservas.avaliacao.reavaliacao_titulo')
          : t('reservas.avaliacao.titulo');
    const espacoAvaliacao = reserva.horarios[0]?.agenda?.espaco;
    const andarAvaliacao = espacoAvaliacao?.andar?.nome ? getAndarLabelByValue(espacoAvaliacao.andar.nome) : null;
    const espacoDescricao = `${t('espacos.titulo')}: ${espacoAvaliacao?.nome ?? ''}`;
    const descricaoAvaliacao = andarAvaliacao ? `${espacoDescricao} / ${andarAvaliacao}` : espacoDescricao;

    if (reserva.validation_status === ValidationStatus.PROCESSING || reserva.validation_status === ValidationStatus.PENDING) {
        return (
            <div className="flex h-full flex-col items-center justify-center">
                <Loader2 className="text-primary mb-4 h-12 w-12 animate-spin" />
                <h2 className="text-xl font-semibold">{t('common.status.processing')}</h2>
                <p className="text-muted-foreground">{t('common.actions.loading')}</p>
            </div>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={tituloAvaliacao} />
            <div className="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col gap-6 rounded-xl p-4">
                <GenericHeader
                    titulo={tituloAvaliacao}
                    descricao={descricaoAvaliacao}
                    actions={
                        <Badge className={`${getStatusReservaColor(situacaoHeader)} flex items-center gap-1`}>
                            <SituacaoIcon situacao={situacaoHeader} />
                            {getStatusReservaText(situacaoHeader)}
                        </Badge>
                    }
                />

                {isCancelada && (
                    <Alert data-testid="reserva-cancelada-alert" className="border-warning-accent/30 bg-warning-subtle/80 text-foreground">
                        <Info className="text-warning-accent h-4 w-4" />
                        <AlertTitle className="font-semibold">{t('reservas.avaliacao.cancelada_titulo')}</AlertTitle>
                        <AlertDescription className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <span>{t('reservas.avaliacao.cancelada_descricao')}</span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 self-start sm:self-center"
                                onClick={() => {
                                    router.get('/gestor/reservas');
                                }}
                            >
                                <ArrowLeft className="mr-1.5 h-4 w-4" />
                                {t('reservas.avaliacao.voltar_listagem')}
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}

                <ReservaInfoCard reserva={reserva}>
                    <div>
                        <h4 className="text-foreground mb-3 flex items-center gap-2 font-medium">
                            <Clock className="h-4 w-4" />
                            {t('reservas.tabela.horarios_solicitados')}
                        </h4>
                        <AgendaNavegacao
                            variant="compact"
                            semanaAtual={semanaVisivel}
                            onAnterior={irParaSemanaAnterior}
                            onProxima={irParaProximaSemana}
                            desabilitarAnterior={!podeVoltar || isLoading}
                            desabilitarProxima={!podeAvancar || isLoading}
                        />
                        <div className="relative mt-2">
                            <CalendarReservationDetails
                                agendas={agendas}
                                diasSemana={diasDaSemana(semanaVisivel, hoje)}
                                slotsSolicitados={slotsSelecao}
                                alternarSelecaoSlot={isCancelada ? () => undefined : avaliarSlot}
                            />
                            {isLoading && (
                                <div className="bg-background/70 absolute inset-0 z-10 flex items-center justify-center rounded-md backdrop-blur-sm">
                                    <Loader2 className="text-primary h-8 w-8 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                </ReservaInfoCard>

                {!isCancelada && (
                    <>
                        <ConflictAlertBox conflicts={todosOsConflitos} />

                        <ConflictCacheSnapshotPanel snapshot={conflictCacheSnapshot} />

                        <EvaluationForm
                            isReavaliacao={isReavaliacao}
                            data={form.data}
                            setData={form.setData}
                            decisao={decisao}
                            isSubmitting={form.processing}
                            isRadioGroupDisabled={isRadioGroupDisabled}
                            slotsSelecao={slotsDoEscopo}
                            onDecisaoChange={handleDecisaoChange}
                            onSubmit={handleSubmit}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    );
}
