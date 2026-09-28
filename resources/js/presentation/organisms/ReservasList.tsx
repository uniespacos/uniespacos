import { comSituacaoEfetivaDoGestor } from '@/lib/utils/reserva-helpers';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PERMISSION_RESERVAS_AVALIAR } from '@/constants/permissions';
import { SituacaoReserva } from '@/contracts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/i18n';
import { Can } from '@/lib/auth-can';
import { SituacaoBadge } from '@/presentation/atoms/SituacaoBadge';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import { LocalReserva } from '@/presentation/molecules/LocalReserva';
import { ReservaCard } from '@/presentation/molecules/ReservaCard';
import { ViewMode } from '@/presentation/molecules/ViewModeToggle';
import ReservaDetalhes from '@/presentation/organisms/ReservasDetalhes';
import { Paginator, Reserva, User as UserType } from '@/types';
import { router } from '@inertiajs/react';
import { Edit, FileText, MoreHorizontal, XCircle } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';

interface ReservasListProps {
    reservaToShow?: Reserva | undefined;
    paginator: Paginator<Reserva>;
    fallback: React.ReactNode;
    isGestor: boolean;
    user?: UserType;
    routeName: string;
    viewMode?: ViewMode;
}

export function ReservasList({ paginator, fallback, isGestor, reservaToShow, routeName, viewMode: controlledViewMode }: ReservasListProps) {
    const { t, formatDate } = useTranslation();
    const { data: reservas, links } = paginator;
    const isMobile = useIsMobile();
    const [internalViewMode] = useState<ViewMode>(isMobile ? 'grid' : 'table');
    const viewMode = controlledViewMode ?? internalViewMode;

    const isModoGestor = isGestor;

    const [selectedReserva, setSelectedReserva] = useState<Reserva | undefined>(undefined);
    const [removerReserva, setRemoverReserva] = useState<Reserva | null>(null);

    const reservasFiltradas = useMemo(() => (isModoGestor ? comSituacaoEfetivaDoGestor(reservas) : reservas), [isModoGestor, reservas]);

    useEffect(() => {
        if (reservaToShow) {
            setSelectedReserva(reservaToShow);
        } else {
            setSelectedReserva(undefined);
        }
    }, [reservaToShow]);

    if (reservas.length === 0) {
        return fallback;
    }

    const handleAvaliarButton = (id: number) => {
        router.get(route('gestor.reservas.show', id));
    };

    const handleAbrirDetalhes = (reserva: Reserva) => {
        setSelectedReserva(reserva);
        const semanaAncora = reserva.horarios[0]?.data ?? String(reserva.data_inicial);
        router.get(
            route(routeName),
            { reserva: reserva.id, semana: semanaAncora },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['reservaToShow', 'semana'],
            },
        );
    };

    const handleFecharDetalhes = () => {
        setSelectedReserva(undefined);
        router.get(
            route(routeName),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                only: ['reservaToShow', 'semana'],
            },
        );
    };

    const renderActions = (reserva: Reserva) => {
        const canEdit = !isModoGestor && reserva.situacao !== SituacaoReserva.INATIVA && (reserva.can_update ?? false);
        const canCancel = !isModoGestor && reserva.situacao !== SituacaoReserva.INATIVA;
        const isGestorEvaluable = isModoGestor && reserva.situacao !== SituacaoReserva.INATIVA;

        return (
            <div className="flex items-center justify-end gap-1.5">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1 px-2.5 text-xs font-medium"
                    onClick={() => {
                        handleAbrirDetalhes(reserva);
                    }}
                >
                    <FileText className="h-3.5 w-3.5" />
                    {t('reservas.acoes.ver_detalhes')}
                </Button>

                {isGestorEvaluable && (
                    <Can
                        permission={PERMISSION_RESERVAS_AVALIAR}
                        fallback={
                            <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-1 px-2.5 text-xs font-medium"
                                onClick={() => {
                                    handleAvaliarButton(reserva.id);
                                }}
                            >
                                <Edit className="h-3.5 w-3.5" />
                                {reserva.situacao === SituacaoReserva.EM_ANALISE
                                    ? t('reservas.acoes.avaliar')
                                    : t('reservas.avaliacao.reavaliacao_titulo')}
                            </Button>
                        }
                    >
                        <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 px-2.5 text-xs font-medium"
                            onClick={() => {
                                handleAvaliarButton(reserva.id);
                            }}
                        >
                            <Edit className="h-3.5 w-3.5" />
                            {reserva.situacao === SituacaoReserva.EM_ANALISE
                                ? t('reservas.acoes.avaliar')
                                : t('reservas.avaliacao.reavaliacao_titulo')}
                        </Button>
                    </Can>
                )}

                {(canEdit || canCancel) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-11 w-11 md:h-8 md:w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">{t('reservas.tabela.acoes')}</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <DropdownMenuItem
                                    onClick={() => {
                                        router.get(`reservas/${String(reserva.id)}/edit`);
                                    }}
                                >
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t('reservas.acoes.editar')}
                                </DropdownMenuItem>
                            )}
                            {canCancel && (
                                <DropdownMenuItem
                                    onClick={() => {
                                        setRemoverReserva(reserva);
                                    }}
                                    className="text-destructive-accent focus:text-destructive-accent"
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('reservas.acoes.cancelar')}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        );
    };

    const columns: ColumnDef<Reserva>[] = [
        {
            header: t('reservas.tabela.espaco'),
            className: 'min-w-[180px]',
            cell: (reserva) => (
                <div className="min-w-0 space-y-0.5">
                    <div className="text-foreground truncate font-semibold" title={reserva.titulo}>
                        {reserva.titulo}
                    </div>
                    {reserva.descricao ? (
                        <p className="text-muted-foreground line-clamp-1 truncate text-xs" title={reserva.descricao}>
                            {reserva.descricao}
                        </p>
                    ) : null}
                    {isModoGestor && reserva.user ? (
                        <p className="text-muted-foreground truncate text-xs">
                            <span className="font-medium">{t('reservas.tabela.solicitante')}:</span> {reserva.user.name}
                        </p>
                    ) : null}
                </div>
            ),
        },
        {
            header: t('espacos.titulo'),
            className: 'min-w-[160px]',
            cell: (reserva) => <LocalReserva espaco={reserva.horarios[0]?.agenda?.espaco} />,
        },
        {
            header: t('reservas.tabela.data_solicitacao'),
            className: 'min-w-[130px] whitespace-nowrap',
            cell: (reserva) => (
                <div className="text-sm">
                    <div className="font-medium">{formatDate(reserva.data_inicial)}</div>
                    {reserva.data_inicial !== reserva.data_final && (
                        <div className="text-muted-foreground text-xs">até {formatDate(reserva.data_final)}</div>
                    )}
                </div>
            ),
        },
        {
            header: t('reservas.tabela.situacao'),
            align: 'center',
            className: 'w-[150px]',
            cell: (reserva) => <SituacaoBadge situacao={reserva.situacao} />,
        },
    ];

    const renderCard = (reserva: Reserva) => (
        <ReservaCard
            key={reserva.id}
            reserva={reserva}
            isGestor={isModoGestor}
            onDetalhes={handleAbrirDetalhes}
            onAvaliar={handleAvaliarButton}
            onEditar={(id) => {
                router.get(`reservas/${String(id)}/edit`);
            }}
            onCancelar={setRemoverReserva}
        />
    );

    return (
        <div className="space-y-4">
            <DataTable
                data={reservasFiltradas}
                columns={columns}
                viewMode={viewMode}
                renderCard={renderCard}
                gridClassName="grid gap-4 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                pagination={{ links }}
                cardWrapper={false}
                actions={renderActions}
            />

            {selectedReserva && (
                <ReservaDetalhes
                    isOpen={Boolean(selectedReserva)}
                    onOpenChange={(open) => {
                        if (!open) {
                            handleFecharDetalhes();
                        }
                    }}
                    isGestor={isModoGestor}
                    selectedReserva={selectedReserva}
                    setRemoverReserva={setRemoverReserva}
                    routeName={routeName}
                />
            )}

            {removerReserva && (
                <DeleteItem
                    isOpen={(open) => {
                        if (!open) {
                            setRemoverReserva(null);
                        }
                    }}
                    itemName={removerReserva.titulo}
                    route={route('reservas.destroy', { reserva: removerReserva.id })}
                />
            )}
        </div>
    );
}
