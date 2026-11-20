import { ESTILO_SITUACAO, SituacaoReserva } from '@/constants/situacao-reserva';
import { type Turno } from '@/constants/turnos';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Horario } from '@/types';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
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
    deferidos: number;
    indeferidos: number;
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
                deferidos: 0,
                indeferidos: 0,
                avaliadoPor: [],
            };

            atual.total += 1;
            if (horario.situacao === SituacaoReserva.DEFERIDA) {
                atual.deferidos += 1;
            } else if (horario.situacao === SituacaoReserva.INDEFERIDA) {
                atual.indeferidos += 1;
            }

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

    const formatarComAvaliadores = (rotulo: string, avaliadores: string[]): string => {
        if (avaliadores.length === 0) {
            return rotulo;
        }

        return `${rotulo} (${avaliadores.join(', ')})`;
    };

    const obterApresentacaoResumo = (resumo: ResumoTurno) => {
        const completo = resumo.avaliados === resumo.total;

        if (!completo) {
            return {
                containerClass: cn(ESTILO_SITUACAO[SituacaoReserva.EM_ANALISE].celula, 'bg-warning-subtle/60 text-foreground'),
                textClass: 'text-warning-accent',
                icon: <Clock className="text-warning-accent mt-0.5 h-3.5 w-3.5 shrink-0" />,
                label: `${t('reservas.situacao.em_analise')} — ${String(resumo.avaliados)}/${String(resumo.total)}`,
            };
        }

        if (resumo.deferidos > 0 && resumo.indeferidos === 0) {
            return {
                containerClass: cn(ESTILO_SITUACAO[SituacaoReserva.DEFERIDA].celula, 'bg-success-subtle/60 text-foreground'),
                textClass: 'text-success-accent',
                icon: <CheckCircle2 className="text-success-accent mt-0.5 h-3.5 w-3.5 shrink-0" />,
                label: formatarComAvaliadores(t('reservas.situacao.deferida'), resumo.avaliadoPor),
            };
        }

        if (resumo.indeferidos > 0 && resumo.deferidos === 0) {
            return {
                containerClass: cn(ESTILO_SITUACAO[SituacaoReserva.INDEFERIDA].celula, 'bg-destructive-subtle/60 text-foreground'),
                textClass: 'text-destructive-accent',
                icon: <XCircle className="text-destructive-accent mt-0.5 h-3.5 w-3.5 shrink-0" />,
                label: formatarComAvaliadores(t('reservas.situacao.indeferida'), resumo.avaliadoPor),
            };
        }

        const rotuloParcial = t('reservas.detalhes.parcialmente_deferida_resumo', {
            deferidos: resumo.deferidos,
            total: resumo.total,
        });

        return {
            containerClass: cn(ESTILO_SITUACAO[SituacaoReserva.EM_ANALISE].celula, 'bg-warning-subtle/60 text-foreground'),
            textClass: 'text-warning-accent',
            icon: <AlertCircle className="text-warning-accent mt-0.5 h-3.5 w-3.5 shrink-0" />,
            label: formatarComAvaliadores(rotuloParcial, resumo.avaliadoPor),
        };
    };

    return (
        <div className="space-y-2">
            {!hideTitle && <h4 className="text-foreground font-medium">{t('reservas.detalhes.avaliacao_gestores')}</h4>}
            <ul className="flex flex-col flex-wrap gap-2 sm:flex-row">
                {resumos.map((resumo) => {
                    const apresentacao = obterApresentacaoResumo(resumo);

                    return (
                        <li
                            key={resumo.agendaId}
                            className={cn(
                                'flex items-start gap-2 rounded-lg border p-2 text-xs transition-colors sm:min-w-48',
                                apresentacao.containerClass,
                            )}
                        >
                            {apresentacao.icon}
                            <div className="min-w-0 flex-1">
                                <p className="text-foreground truncate font-semibold">
                                    {t(`reservas.turnos.${resumo.turno}`)} — {resumo.gestor}
                                </p>
                                <p className={cn('text-[11px] font-medium', apresentacao.textClass)}>{apresentacao.label}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
