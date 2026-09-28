import { Button } from '@/components/ui/button';
import { PERMISSION_RESERVAS_AVALIAR } from '@/constants/permissions';
import { opcoesRecorrencia } from '@/constants/recorrencia';
import { SituacaoReserva } from '@/contracts';
import { useTranslation } from '@/i18n';
import { Can } from '@/lib/auth-can';
import { diasDaSemana } from '@/lib/utils';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { mapearStatusBackendParaSlot } from '@/lib/utils/reserva-status.helpers';
import { SituacaoBadge } from '@/presentation/atoms/SituacaoBadge';
import { UserAvatar } from '@/presentation/atoms/UserAvatar';
import AgendaNavegacao from '@/presentation/molecules/AgendaNavegacao';
import AvaliacaoGestoresResumo from '@/presentation/molecules/AvaliacaoGestoresResumo';
import CalendarReservationDetails from '@/presentation/molecules/CalendarReservationDetails';
import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';
import { Agenda, Reserva, SlotCalendario } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { addDays, endOfWeek, format, isAfter, isBefore, parseISO, startOfWeek, subDays } from 'date-fns';
import {
    AlertCircle,
    Building2,
    CalendarDays,
    Clock,
    Edit,
    ExternalLink,
    FileText,
    Info,
    Loader2,
    MapPin,
    Repeat,
    User as UserIcon,
    Users,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';

declare function route(name: string, params?: unknown): string;

export interface ReservaDetalhesProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedReserva: Reserva;
    isGestor?: boolean;
    setRemoverReserva: (selectedReserva: Reserva) => void;
    routeName: string;
}

export default function ReservaDetalhes({
    isOpen,
    onOpenChange,
    selectedReserva,
    isGestor = false,
    setRemoverReserva,
    routeName,
}: ReservaDetalhesProps) {
    const { t, formatDate } = useTranslation();
    const { semana } = usePage<{ semana?: { referencia: string } }>().props;

    const [isLoading, setIsLoading] = useState(false);
    const [semanaVisivel, setSemanaVisivel] = useState(() => {
        const primeiroHorarioData = selectedReserva.horarios[0]?.data;
        if (primeiroHorarioData) {
            return parseISO(primeiroHorarioData);
        }
        return semana?.referencia ? parseISO(semana.referencia) : new Date();
    });

    const slotsSelecao = useMemo<SlotCalendario[]>(() => {
        return selectedReserva.horarios.map((horario) => ({
            id: `${horario.data}|${horario.horario_inicio}`,
            status: mapearStatusBackendParaSlot(horario.situacao),
            data: parseISO(horario.data + 'T12:00:00'),
            horario_inicio: horario.horario_inicio,
            horario_fim: horario.horario_fim,
            agenda_id: horario.agenda?.id,
            dadosReserva: { horarioDB: horario, autor: selectedReserva.user?.name ?? '', reserva_titulo: selectedReserva.titulo },
            isShowReservation: true,
        }));
    }, [selectedReserva.horarios, selectedReserva.user, selectedReserva.titulo]);

    const agendas = useMemo(
        () =>
            selectedReserva.horarios
                .map((horario) => horario.agenda)
                .filter((agenda): agenda is Agenda => agenda !== undefined)
                .reduce((acc: Agenda[], agenda) => (acc.find((item) => item.id === agenda.id) ? acc : [...acc, agenda]), []),
        [selectedReserva.horarios],
    );

    const justificativaReserva = selectedReserva.horarios.find((horario) => horario.situacao === SituacaoReserva.INDEFERIDA)?.justificativa;
    const espaco = selectedReserva.horarios[0]?.agenda?.espaco;
    const andar = espaco?.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : undefined;
    const local = [espaco?.nome, espaco?.andar?.modulo?.nome, andar].filter(Boolean).join(' - ');

    const labelRecorrencia = useMemo(() => {
        const op = opcoesRecorrencia.find((o) => o.valor === selectedReserva.recorrencia);
        return op?.label ?? selectedReserva.recorrencia;
    }, [selectedReserva.recorrencia]);

    const navegarParaSemana = (novaData: Date) => {
        setSemanaVisivel(novaData);
        const params: { reserva: number; semana: string } = {
            reserva: selectedReserva.id,
            semana: format(novaData, 'yyyy-MM-dd'),
        };
        router.get(route(routeName), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => {
                setIsLoading(true);
            },
            onFinish: () => {
                setIsLoading(false);
            },
            only: ['reservaToShow', 'semana'],
        });
    };

    const handleSemanaAnterior = () => {
        navegarParaSemana(subDays(semanaVisivel, 7));
    };
    const handleProximaSemana = () => {
        navegarParaSemana(addDays(semanaVisivel, 7));
    };

    const dataInicialReserva = useMemo(() => new Date(selectedReserva.data_inicial), [selectedReserva.data_inicial]);
    const dataFinalReserva = useMemo(() => new Date(selectedReserva.data_final), [selectedReserva.data_final]);
    const podeVoltar = useMemo(
        () => isAfter(startOfWeek(semanaVisivel, { weekStartsOn: 1 }), dataInicialReserva),
        [dataInicialReserva, semanaVisivel],
    );
    const podeAvancar = useMemo(() => isBefore(endOfWeek(semanaVisivel, { weekStartsOn: 1 }), dataFinalReserva), [dataFinalReserva, semanaVisivel]);

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={onOpenChange}
            size="3xl"
            title={
                <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-foreground truncate text-base font-semibold sm:text-lg" title={selectedReserva.titulo}>
                                {selectedReserva.titulo}
                            </h3>
                            <p className="text-muted-foreground truncate text-xs">
                                {t('reservas.detalhes.titulo')} #{selectedReserva.id}
                            </p>
                        </div>
                    </div>
                    <SituacaoBadge situacao={selectedReserva.situacao} className="shrink-0" />
                </div>
            }
            footer={
                <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="default"
                        className="min-h-[44px] text-xs sm:min-w-[90px]"
                        onClick={() => {
                            onOpenChange(false);
                        }}
                    >
                        {t('common.actions.close')}
                    </Button>

                    {isGestor ? (
                        <Can
                            permission={PERMISSION_RESERVAS_AVALIAR}
                            fallback={
                                <Button
                                    type="button"
                                    variant="default"
                                    size="default"
                                    className="min-h-[44px] gap-1.5 text-xs font-semibold"
                                    onClick={() => {
                                        router.get(`/gestor/reservas/${String(selectedReserva.id)}`);
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                    {selectedReserva.situacao === SituacaoReserva.EM_ANALISE
                                        ? t('reservas.acoes.avaliar')
                                        : t('reservas.avaliacao.reavaliacao_titulo')}
                                </Button>
                            }
                        >
                            <Button
                                type="button"
                                variant="default"
                                size="default"
                                className="min-h-[44px] gap-1.5 text-xs font-semibold"
                                onClick={() => {
                                    router.get(`/gestor/reservas/${String(selectedReserva.id)}`);
                                }}
                            >
                                <Edit className="h-4 w-4" />
                                {selectedReserva.situacao === SituacaoReserva.EM_ANALISE
                                    ? t('reservas.acoes.avaliar')
                                    : t('reservas.avaliacao.reavaliacao_titulo')}
                            </Button>
                        </Can>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {selectedReserva.can_update && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    className="min-h-[44px] flex-1 gap-1.5 text-xs font-semibold sm:flex-initial"
                                    onClick={() => {
                                        router.get(route('reservas.edit', selectedReserva.id));
                                    }}
                                >
                                    <Edit className="h-4 w-4" />
                                    {t('reservas.acoes.editar')}
                                </Button>
                            )}
                            {selectedReserva.situacao !== SituacaoReserva.INATIVA && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    className="min-h-[44px] flex-1 gap-1.5 text-xs font-semibold text-destructive-accent hover:text-destructive-accent sm:flex-initial"
                                    onClick={() => {
                                        setRemoverReserva(selectedReserva);
                                    }}
                                >
                                    <XCircle className="h-4 w-4 text-destructive-accent" />
                                    {t('reservas.acoes.cancelar')}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-4 py-1 text-sm">
                {/* Seção 1: Context Cards Responsivos (Diferenciação Gestor vs Solicitante) */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {/* Card de Identificação da Pessoa */}
                    {isGestor ? (
                        <div className="bg-card border-border/80 flex flex-col justify-between rounded-xl border p-3.5 shadow-xs">
                            <div className="space-y-2">
                                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                                    {t('reservas.detalhes.solicitante')}
                                </span>
                                <div className="flex items-center gap-3">
                                    {selectedReserva.user ? (
                                        <UserAvatar user={selectedReserva.user} className="h-10 w-10 shrink-0" />
                                    ) : (
                                        <div className="bg-muted text-muted-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                                            <UserIcon className="h-5 w-5" />
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-foreground truncate font-semibold">
                                            {selectedReserva.user?.name ?? t('common.status.unknown')}
                                        </p>
                                        {selectedReserva.user?.email && (
                                            <p className="text-muted-foreground truncate text-xs">{selectedReserva.user.email}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedReserva.created_at && (
                                <div className="text-muted-foreground border-border/40 mt-3 flex items-center gap-1.5 border-t pt-2 text-xs">
                                    <Clock className="h-3.5 w-3.5 shrink-0" />
                                    <span>
                                        {t('reservas.detalhes.solicitado_em')}: {formatDate(selectedReserva.created_at)}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-card border-border/80 flex flex-col justify-between rounded-xl border p-3.5 shadow-xs">
                            <div className="space-y-2">
                                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                                    {t('reservas.detalhes.avaliacao_gestores')}
                                </span>
                                <AvaliacaoGestoresResumo horarios={selectedReserva.horarios} hideTitle={true} />
                            </div>
                        </div>
                    )}

                    {/* Card do Espaço Físico */}
                    <div className="bg-card border-border/80 flex flex-col justify-between rounded-xl border p-3.5 shadow-xs">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                                    {t('reservas.detalhes.espaco')}
                                </span>
                                {espaco && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-primary hover:text-primary/80 h-7 gap-1 px-2 text-xs font-medium"
                                        onClick={() => {
                                            router.get(route('espacos.show', espaco.id));
                                        }}
                                    >
                                        {t('espacos.card.ver_agenda')}
                                        <ExternalLink className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-start gap-2.5">
                                <div className="bg-secondary text-secondary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                                    <Building2 className="h-4.5 w-4.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-foreground truncate font-semibold">{espaco?.nome ?? t('common.status.unknown')}</p>
                                    <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{local || t('common.status.unknown')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {espaco?.capacidade_pessoas ? (
                            <div className="border-border/40 mt-3 flex items-center gap-2 border-t pt-2 text-xs">
                                <span className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium">
                                    <Users className="h-3 w-3 shrink-0" />
                                    {espaco.capacidade_pessoas === 1
                                        ? t('espacos.pessoa')
                                        : t('espacos.pessoas', { count: String(espaco.capacidade_pessoas) })}
                                </span>
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Seção 2: Metadados da Reserva em Chips */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="bg-muted/30 border-border/60 flex items-center gap-2.5 rounded-lg border p-2.5">
                        <CalendarDays className="text-primary h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 text-xs">
                            <p className="text-muted-foreground font-medium">{t('reservas.stepper.period_recurrence')}</p>
                            <p className="text-foreground truncate font-semibold">
                                {formatDate(selectedReserva.data_inicial)} até {formatDate(selectedReserva.data_final)}
                            </p>
                        </div>
                    </div>

                    <div className="bg-muted/30 border-border/60 flex items-center gap-2.5 rounded-lg border p-2.5">
                        <Repeat className="text-primary h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 text-xs">
                            <p className="text-muted-foreground font-medium">{t('reservas.stepper.recurrence_pattern')}</p>
                            <p className="text-foreground truncate font-semibold">{labelRecorrencia}</p>
                        </div>
                    </div>

                    <div className="bg-muted/30 border-border/60 flex items-center gap-2.5 rounded-lg border p-2.5">
                        <Clock className="text-primary h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1 text-xs">
                            <p className="text-muted-foreground font-medium">{t('reservas.tabela.horarios_solicitados')}</p>
                            <p className="text-foreground truncate font-semibold">
                                {selectedReserva.horarios.length} {selectedReserva.horarios.length === 1 ? 'horário' : 'horários'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Seção 3: Justificativa / Finalidade */}
                <div className="bg-muted/30 border-border/60 space-y-1.5 rounded-xl border p-3.5">
                    <div className="flex items-center gap-2">
                        <FileText className="text-muted-foreground h-4 w-4" />
                        <h4 className="text-foreground text-xs font-semibold tracking-wider uppercase">{t('reservas.detalhes.justificativa')}</h4>
                    </div>
                    <p className="text-foreground text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">
                        {selectedReserva.descricao.trim() || t('reservas.detalhes.sem_justificativa')}
                    </p>
                </div>

                {/* Seção 4: Grade de Horários Solicitados */}
                <div className="space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="text-primary h-4 w-4" />
                            <h4 className="text-foreground text-sm font-semibold">{t('reservas.tabela.horarios_solicitados')}</h4>
                        </div>
                        <AgendaNavegacao
                            variant="compact"
                            semanaAtual={semanaVisivel}
                            onAnterior={handleSemanaAnterior}
                            onProxima={handleProximaSemana}
                            desabilitarAnterior={!podeVoltar || isLoading}
                            desabilitarProxima={!podeAvancar || isLoading}
                        />
                    </div>

                    <div className="border-border/80 relative overflow-hidden rounded-xl border">
                        <CalendarReservationDetails
                            agendas={agendas}
                            diasSemana={diasDaSemana(semanaVisivel, new Date())}
                            slotsSolicitados={slotsSelecao}
                        />
                        {isLoading && (
                            <div className="bg-background/70 absolute inset-0 z-20 flex items-center justify-center rounded-xl backdrop-blur-xs">
                                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Seção 5: Pareceres & Observações */}
                {justificativaReserva && (
                    <div className="bg-destructive-subtle/80 border-destructive-accent/30 text-destructive-accent space-y-1.5 rounded-xl border p-3.5">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="text-destructive-accent h-4 w-4 shrink-0" />
                            <h4 className="text-destructive-accent text-xs font-semibold tracking-wider uppercase">
                                {t('reservas.avaliacao.parecer')}
                            </h4>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">{justificativaReserva}</p>
                    </div>
                )}

                {selectedReserva.observacao && (
                    <div className="bg-info-subtle/80 border-info-accent/30 text-info-accent space-y-1.5 rounded-xl border p-3.5">
                        <div className="flex items-center gap-2">
                            <Info className="text-info-accent h-4 w-4 shrink-0" />
                            <h4 className="text-info-accent text-xs font-semibold tracking-wider uppercase">{t('reservas.avaliacao.observacao')}</h4>
                        </div>
                        <p className="text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">{selectedReserva.observacao}</p>
                    </div>
                )}
            </div>
        </ResponsiveModal>
    );
}
