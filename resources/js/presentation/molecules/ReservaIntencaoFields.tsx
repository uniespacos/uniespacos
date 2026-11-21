import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { type TurnoType } from '@/contracts';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { chaveTurnoFiltro } from '@/lib/utils/disponibilidade-filtro';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { addDays, format, isBefore, parseISO, startOfToday } from 'date-fns';
import React from 'react';

export const QUALQUER_TURNO_INTENCAO = 'qualquer';
export type TurnoIntencao = TurnoType | typeof QUALQUER_TURNO_INTENCAO;

export const ATALHOS_CAPACIDADE = ['10', '25', '40', '60'] as const;

export interface ReservaIntencaoFieldsProps {
    data: string;
    turno: TurnoIntencao;
    capacidade: string;
    onDataChange: (data: Date | undefined) => void;
    onTurnoChange: (turno: TurnoIntencao) => void;
    onCapacidadeChange: (valor: string, imediato?: boolean) => void;
    disponibilidade?: boolean;
    idPrefix?: string;
    className?: string;
}

export const ReservaIntencaoFields: React.FC<ReservaIntencaoFieldsProps> = ({
    data,
    turno,
    capacidade,
    onDataChange,
    onTurnoChange,
    onCapacidadeChange,
    disponibilidade = true,
    idPrefix = '',
    className,
}) => {
    const { t } = useTranslation();
    const hoje = startOfToday();
    const amanha = addDays(hoje, 1);
    const hojeIso = format(hoje, 'yyyy-MM-dd');
    const amanhaIso = format(amanha, 'yyyy-MM-dd');

    const isHoje = data === hojeIso;
    const isAmanha = data === amanhaIso;

    const handleQuickDate = (targetDate: Date, isAlreadySelected: boolean) => {
        if (isAlreadySelected) {
            onDataChange(undefined);
            return;
        }
        onDataChange(targetDate);
    };

    const handleQuickCapacidade = (atalho: string) => {
        if (capacidade === atalho) {
            onCapacidadeChange('', true);
            return;
        }
        onCapacidadeChange(atalho, true);
    };

    const dataId = `${idPrefix}espacos-data`;
    const capacidadeId = `${idPrefix}espacos-capacidade`;

    return (
        <div className={cn('grid grid-cols-1 gap-4', disponibilidade ? 'lg:grid-cols-3' : 'lg:grid-cols-1', className)}>
            {disponibilidade && (
                <>
                    <div className="space-y-1.5">
                        <Label htmlFor={dataId} className="text-muted-foreground text-xs font-medium">
                            {t('espacos.filtros.quando')}
                        </Label>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                type="button"
                                variant={isHoje ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={isHoje}
                                onClick={() => {
                                    handleQuickDate(hoje, isHoje);
                                }}
                                className="h-11 px-3 text-xs font-medium md:h-9"
                            >
                                {t('espacos.filtros.hoje')}
                            </Button>
                            <Button
                                type="button"
                                variant={isAmanha ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={isAmanha}
                                onClick={() => {
                                    handleQuickDate(amanha, isAmanha);
                                }}
                                className="h-11 px-3 text-xs font-medium md:h-9"
                            >
                                {t('espacos.filtros.amanha')}
                            </Button>
                            <div className="min-w-[150px] flex-1">
                                <DatePicker
                                    id={dataId}
                                    value={data ? parseISO(data) : undefined}
                                    onSelect={onDataChange}
                                    disabled={(date) => isBefore(date, hoje)}
                                    clearable
                                    placeholder={t('espacos.filtros.selecione_data')}
                                    className="border-input hover:text-foreground h-11 bg-transparent px-3 py-2 text-sm hover:bg-transparent md:h-9 dark:bg-transparent dark:hover:bg-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <span className="text-muted-foreground block text-xs font-medium">{t('espacos.filtros.turno')}</span>
                        <div role="group" aria-label={t('espacos.filtros.turno')} className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                            <Button
                                type="button"
                                variant={turno === QUALQUER_TURNO_INTENCAO ? 'default' : 'outline'}
                                size="sm"
                                disabled={!data}
                                aria-pressed={turno === QUALQUER_TURNO_INTENCAO}
                                onClick={() => {
                                    onTurnoChange(QUALQUER_TURNO_INTENCAO);
                                }}
                                className="h-11 px-2 text-xs font-medium md:h-9"
                            >
                                {t('espacos.filtros.qualquer_turno')}
                            </Button>
                            {TURNOS_ORDENADOS.map((itemTurno) => {
                                const selecionado = turno === itemTurno;
                                return (
                                    <Button
                                        key={itemTurno}
                                        type="button"
                                        variant={selecionado ? 'default' : 'outline'}
                                        size="sm"
                                        disabled={!data}
                                        aria-pressed={selecionado}
                                        onClick={() => {
                                            onTurnoChange(selecionado ? QUALQUER_TURNO_INTENCAO : itemTurno);
                                        }}
                                        className="h-11 px-2 text-xs font-medium md:h-9"
                                    >
                                        {t(chaveTurnoFiltro(itemTurno))}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            <div className="space-y-1.5">
                <Label htmlFor={capacidadeId} className="text-muted-foreground text-xs font-medium">
                    {t('espacos.filtros.quantas_pessoas')}
                </Label>
                <div className="flex flex-wrap items-center gap-1.5">
                    {ATALHOS_CAPACIDADE.map((atalho) => {
                        const ativo = capacidade === atalho;
                        return (
                            <Button
                                key={atalho}
                                type="button"
                                variant={ativo ? 'default' : 'outline'}
                                size="sm"
                                aria-pressed={ativo}
                                onClick={() => {
                                    handleQuickCapacidade(atalho);
                                }}
                                className="h-11 px-2.5 text-xs font-medium tabular-nums md:h-9"
                            >
                                {t('espacos.filtros.capacidade_atalho', { count: atalho })}
                            </Button>
                        );
                    })}
                    <Input
                        id={capacidadeId}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={capacidade}
                        onChange={(e) => {
                            onCapacidadeChange(e.target.value, false);
                        }}
                        className="h-11 min-w-[84px] flex-1 md:h-9"
                    />
                </div>
            </div>
        </div>
    );
};

export default ReservaIntencaoFields;
