import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { endOfWeek, format, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import React from 'react';

export interface AgendaNavegacaoProps {
    semanaAtual?: Date;
    dataReferencia?: Date;
    onAnterior?: () => void;
    onSemanaAnterior?: () => void;
    onProxima?: () => void;
    onProximaSemana?: () => void;
    onReset?: () => void;
    onHoje?: () => void;
    desabilitarAnterior?: boolean;
    desabilitarProxima?: boolean;
    isLoading?: boolean;
    variant?: 'full' | 'compact';
}

export function AgendaNavegacao({
    semanaAtual,
    dataReferencia,
    onAnterior,
    onSemanaAnterior,
    onProxima,
    onProximaSemana,
    onReset,
    onHoje,
    desabilitarAnterior = false,
    desabilitarProxima = false,
    isLoading = false,
    variant = 'full',
}: AgendaNavegacaoProps) {
    const { t } = useTranslation();
    const dataRef = semanaAtual ?? dataReferencia ?? new Date();
    const handleAnterior = onAnterior ?? onSemanaAnterior;
    const handleProxima = onProxima ?? onProximaSemana;
    const handleReset = onReset ?? onHoje;
    const desabAnterior = desabilitarAnterior || isLoading;
    const desabProxima = desabilitarProxima || isLoading;

    const inicioDaSemana = startOfWeek(dataRef, { weekStartsOn: 1 });
    const fimDaSemana = endOfWeek(dataRef, { weekStartsOn: 1 });
    const formatoFim = variant === 'compact' ? 'dd/MM/yyyy' : 'dd/MM';
    const textoIntervalo = `${format(inicioDaSemana, 'dd/MM')} - ${format(fimDaSemana, formatoFim)}`;

    if (variant === 'compact') {
        return (
            <div className="flex items-center justify-between gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnterior}
                    disabled={desabAnterior}
                    aria-label={t('agenda.semana_anterior_label')}
                    className="h-8 px-2 text-xs transition-transform active:scale-95"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{t('agenda.semana_anterior')}</span>
                    <span className="sm:hidden">{t('agenda.anterior')}</span>
                </Button>

                <div className="text-foreground flex items-center gap-1.5 text-xs font-semibold tracking-tight transition-all duration-300 sm:text-sm">
                    {isLoading && <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />}
                    <h2 className="tabular-nums">{textoIntervalo}</h2>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProxima}
                    disabled={desabProxima}
                    aria-label={t('agenda.proxima_semana_label')}
                    className="h-8 px-2 text-xs transition-transform active:scale-95"
                >
                    <span className="hidden sm:inline">{t('agenda.proxima_semana')}</span>
                    <span className="sm:hidden">{t('agenda.proxima')}</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="border-border bg-card flex flex-col gap-2 rounded-xl border p-2 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-3">
            <div className="flex items-center justify-between gap-1.5 sm:justify-start">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnterior}
                    disabled={desabAnterior}
                    aria-label={t('agenda.semana_anterior_label')}
                    className="h-8 px-2 text-xs transition-transform active:scale-95 sm:px-3"
                >
                    <ChevronLeft className="mr-0 h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('agenda.anterior')}</span>
                </Button>

                {handleReset && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isLoading}
                        className="h-8 px-2.5 text-xs font-medium transition-transform active:scale-95"
                    >
                        {t('agenda.hoje')}
                    </Button>
                )}

                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProxima}
                    disabled={desabProxima}
                    aria-label={t('agenda.proxima_semana_label')}
                    className="h-8 px-2 text-xs transition-transform active:scale-95 sm:hidden"
                >
                    <span className="hidden sm:inline">{t('agenda.proxima')}</span>
                    <ChevronRight className="ml-0 h-4 w-4 sm:ml-1" />
                </Button>
            </div>

            {/* Rótulo da semana com transição suave */}
            <div className="text-foreground flex items-center justify-center gap-2 text-xs font-semibold tracking-tight transition-all duration-300 sm:text-sm">
                {isLoading && <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />}
                <h2 className="tabular-nums">{textoIntervalo}</h2>
            </div>

            <div className="hidden sm:flex sm:items-center sm:justify-end sm:gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleProxima}
                    disabled={desabProxima}
                    aria-label={t('agenda.proxima_semana_label')}
                    className="h-8 px-3 text-xs transition-transform active:scale-95"
                >
                    <span>{t('agenda.proxima')}</span>
                    <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default AgendaNavegacao;
