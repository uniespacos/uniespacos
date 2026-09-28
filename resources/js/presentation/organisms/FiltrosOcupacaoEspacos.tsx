import { Label } from '@/components/ui/label';
import { TURNOS_ORDENADOS, TURNO_LABEL, Turno } from '@/constants/turnos';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { FiltroChips } from '@/presentation/molecules/FiltroChips';
import { PeriodoQuickShortcuts, PeriodoShortcutKey } from '@/presentation/molecules/PeriodoQuickShortcuts';
import { FiltrosRelatorio } from '@/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface Props {
    filtros: Partial<FiltrosRelatorio>;
    onChange: (filtros: Partial<FiltrosRelatorio>) => void;
}

export function FiltrosOcupacaoEspacos({ filtros, onChange }: Props) {
    const [dataInicio, setDataInicio] = useState<Date | undefined>(filtros.data_inicio ? new Date(filtros.data_inicio + 'T00:00:00') : undefined);
    const [dataFim, setDataFim] = useState<Date | undefined>(filtros.data_fim ? new Date(filtros.data_fim + 'T23:59:59') : undefined);
    const [activeShortcut, setActiveShortcut] = useState<PeriodoShortcutKey | undefined>(
        !filtros.data_inicio && !filtros.data_fim ? undefined : 'custom',
    );

    const turnos = TURNOS_ORDENADOS.map((turno) => ({
        value: turno,
        label: TURNO_LABEL[turno],
    }));

    const handleShortcutSelect = (inicio: string, fim: string, key: PeriodoShortcutKey) => {
        setActiveShortcut(key);
        setDataInicio(new Date(inicio + 'T00:00:00'));
        setDataFim(new Date(fim + 'T23:59:59'));
        onChange({
            ...filtros,
            data_inicio: inicio,
            data_fim: fim,
        });
    };

    const handleDataInicioChange = (date: Date | undefined) => {
        setActiveShortcut('custom');
        setDataInicio(date);
        onChange({
            ...filtros,
            data_inicio: date ? format(date, 'yyyy-MM-dd') : undefined,
        });
    };

    const handleDataFimChange = (date: Date | undefined) => {
        setActiveShortcut('custom');
        setDataFim(date);
        onChange({
            ...filtros,
            data_fim: date ? format(date, 'yyyy-MM-dd') : undefined,
        });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Atalhos Rápidos de Período</Label>
                    <PeriodoQuickShortcuts activeShortcut={activeShortcut} onSelectRange={handleShortcutSelect} />
                </div>

                <div className="grid gap-3 pt-1 sm:grid-cols-2">
                    <div>
                        <Label className="mb-1.5 block text-xs font-medium">Data Início</Label>
                        <DatePicker value={dataInicio} onSelect={handleDataInicioChange} placeholder="Selecione início..." />
                    </div>

                    <div>
                        <Label className="mb-1.5 block text-xs font-medium">Data Fim</Label>
                        <DatePicker value={dataFim} onSelect={handleDataFimChange} placeholder="Selecione fim..." />
                    </div>
                </div>
            </div>

            <div className="border-border/50 border-t pt-1">
                <FiltroChips
                    label="Turnos"
                    opcoes={turnos}
                    selecionados={filtros.turnos ?? []}
                    onChange={(valores) => {
                        onChange({
                            ...filtros,
                            turnos: valores as Turno[],
                        });
                    }}
                />
            </div>
        </div>
    );
}
