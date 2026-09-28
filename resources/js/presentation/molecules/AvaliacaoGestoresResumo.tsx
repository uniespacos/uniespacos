import { TURNO_LABEL, type Turno } from '@/constants/turnos';
import { SituacaoReserva } from '@/contracts';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Horario } from '@/types';
import { CheckCircle2, Clock } from 'lucide-react';
import { useMemo } from 'react';

interface AvaliacaoGestoresResumoProps {
    horarios: Horario[];
    hideTitle?: boolean;
}

interface ResumoTurno {
    agendaId: number;
    turno: Turno;
    gestor: string;
    total: number;
    avaliados: number;
    avaliadoPor: string[];
}

export default function AvaliacaoGestoresResumo({ horarios, hideTitle = false }: AvaliacaoGestoresResumoProps) {
    const { t } = useTranslation();

    const resumos = useMemo(() => {
        const porAgenda = new Map<number, ResumoTurno>();

        horarios.forEach((horario) => {
            const agenda = horario.agenda;
            if (!agenda) {
                return;
            }

            const atual = porAgenda.get(agenda.id) ?? {
                agendaId: agenda.id,
                turno: agenda.turno,
                gestor: agenda.user?.name ?? t('reservas.detalhes.gestor_nao_definido'),
                total: 0,
                avaliados: 0,
                avaliadoPor: [],
            };

            atual.total += 1;
            if (horario.situacao !== SituacaoReserva.EM_ANALISE) {
                atual.avaliados += 1;
                if (horario.avaliador && !atual.avaliadoPor.includes(horario.avaliador.name)) {
                    atual.avaliadoPor.push(horario.avaliador.name);
                }
            }

            porAgenda.set(agenda.id, atual);
        });

        return [...porAgenda.values()].sort((a, b) => a.turno.localeCompare(b.turno));
    }, [horarios, t]);

    if (resumos.length === 0) {
        return <p className="text-muted-foreground text-xs italic">{t('reservas.detalhes.gestor_nao_definido')}</p>;
    }

    return (
        <div className="space-y-2">
            {!hideTitle && <h4 className="text-foreground font-medium">{t('reservas.detalhes.avaliacao_gestores')}</h4>}
            <ul className="flex flex-col flex-wrap gap-2 sm:flex-row">
                {resumos.map((resumo) => {
                    const completo = resumo.avaliados === resumo.total;

                    return (
                        <li
                            key={resumo.agendaId}
                            className={cn(
                                'flex items-start gap-2 rounded-lg border p-2 text-xs transition-colors sm:min-w-48',
                                completo
                                    ? 'border-success-accent/30 bg-success-subtle/60 text-foreground'
                                    : 'border-warning-accent/30 bg-warning-subtle/60 text-foreground',
                            )}
                        >
                            {completo ? (
                                <CheckCircle2 className="text-success-accent mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                                <Clock className="text-warning-accent mt-0.5 h-3.5 w-3.5 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate font-semibold">
                                    {TURNO_LABEL[resumo.turno]} — {resumo.gestor}
                                </p>
                                <p className={cn('text-[11px] font-medium', completo ? 'text-success-accent' : 'text-warning-accent')}>
                                    {completo
                                        ? resumo.avaliadoPor.length > 0
                                            ? `${t('reservas.situacao.deferida')} (${resumo.avaliadoPor.join(', ')})`
                                            : t('common.status.completed')
                                        : `${t('reservas.situacao.em_analise')} — ${String(resumo.avaliados)}/${String(resumo.total)}`}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
