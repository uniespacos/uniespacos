import { Button } from '@/components/ui/button';
import { PERMISSION_RESERVAS_AVALIAR } from '@/constants/permissions';
import { ESTILO_SITUACAO } from '@/constants/situacao-reserva';
import { SituacaoReserva } from '@/contracts';
import { useTranslation } from '@/i18n';
import { useCan } from '@/lib/auth-can';
import { cn } from '@/lib/utils';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { SituacaoBadge } from '@/presentation/atoms/SituacaoBadge';
import { Reserva } from '@/types';
import { Calendar, Edit, FileText, MapPin, XCircle } from 'lucide-react';

interface ReservaCardProps {
    reserva: Reserva;
    isGestor?: boolean;
    onDetalhes: (reserva: Reserva) => void;
    onAvaliar?: (id: number) => void;
    onEditar?: (id: number) => void;
    onCancelar?: (reserva: Reserva) => void;
}

export function ReservaCard({ reserva, isGestor, onDetalhes, onAvaliar, onEditar, onCancelar }: ReservaCardProps) {
    const { t, formatDate } = useTranslation();
    const estilo = ESTILO_SITUACAO[reserva.situacao];
    const espaco = reserva.horarios[0]?.agenda?.espaco;
    const andar = espaco?.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : undefined;
    const local = [espaco?.nome, espaco?.andar?.modulo?.nome, andar].filter(Boolean).join(' - ');

    const hasEvalPermission = useCan({ permission: PERMISSION_RESERVAS_AVALIAR });
    const isModoGestor = isGestor ?? hasEvalPermission;

    return (
        <div className="bg-card border-border/80 relative flex w-full min-w-0 overflow-hidden rounded-xl border shadow-xs transition-all duration-200 active:scale-[0.99]">
            <div className={cn('w-1.5 shrink-0', estilo.solido)} />

            <div className="min-w-0 flex-1 space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-foreground min-w-0 truncate text-base font-semibold" title={reserva.titulo}>
                        {reserva.titulo}
                    </p>
                    <SituacaoBadge situacao={reserva.situacao} className="shrink-0" />
                </div>

                <div className="text-muted-foreground space-y-1.5 text-xs">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="text-muted-foreground/80 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 truncate" title={local || t('common.status.unknown')}>
                            {local || t('common.status.unknown')}
                        </span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1.5">
                        <Calendar className="text-muted-foreground/80 h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 truncate">
                            {formatDate(reserva.data_inicial)} até {formatDate(reserva.data_final)}
                        </span>
                    </div>
                </div>

                <div className="border-border/60 flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] min-w-[120px] flex-1 text-xs font-medium transition-transform active:scale-[0.98]"
                        onClick={() => {
                            onDetalhes(reserva);
                        }}
                    >
                        <FileText className="mr-1.5 h-4 w-4" />
                        {t('reservas.acoes.ver_detalhes')}
                    </Button>

                    {reserva.situacao !== SituacaoReserva.INATIVA &&
                        (isModoGestor ? (
                            onAvaliar ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px] min-w-[120px] flex-1 text-xs font-medium transition-transform active:scale-[0.98]"
                                    onClick={() => {
                                        onAvaliar(reserva.id);
                                    }}
                                >
                                    <Edit className="mr-1.5 h-4 w-4" />
                                    {reserva.situacao === SituacaoReserva.EM_ANALISE
                                        ? t('reservas.acoes.avaliar')
                                        : t('reservas.avaliacao.reavaliacao_titulo')}
                                </Button>
                            ) : null
                        ) : (
                            <>
                                {reserva.can_update && onEditar ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="min-h-[44px] min-w-[100px] flex-1 text-xs font-medium transition-transform active:scale-[0.98]"
                                        onClick={() => {
                                            onEditar(reserva.id);
                                        }}
                                    >
                                        <Edit className="mr-1.5 h-4 w-4" />
                                        {t('reservas.acoes.editar')}
                                    </Button>
                                ) : null}
                                {onCancelar ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive-accent hover:text-destructive-accent min-h-[44px] min-w-[100px] flex-1 text-xs font-medium transition-transform active:scale-[0.98]"
                                        onClick={() => {
                                            onCancelar(reserva);
                                        }}
                                    >
                                        <XCircle className="text-destructive-accent mr-1.5 h-4 w-4" />
                                        {t('reservas.acoes.cancelar')}
                                    </Button>
                                ) : null}
                            </>
                        ))}
                </div>
            </div>
        </div>
    );
}
