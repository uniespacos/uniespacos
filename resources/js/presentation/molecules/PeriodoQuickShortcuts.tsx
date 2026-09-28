import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { endOfDay, endOfMonth, endOfYear, format, startOfDay, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';

export type PeriodoShortcutKey = 'hoje' | '7dias' | 'este_mes' | 'mes_anterior' | 'ano_atual' | 'custom';

export interface PeriodoQuickShortcutsProps {
    activeShortcut?: PeriodoShortcutKey;
    onSelectRange: (inicio: string, fim: string, shortcutKey: PeriodoShortcutKey) => void;
    className?: string;
}

export const PeriodoQuickShortcuts: React.FC<PeriodoQuickShortcutsProps> = ({ activeShortcut = 'este_mes', onSelectRange, className }) => {
    const handleSelect = (key: PeriodoShortcutKey) => {
        const now = new Date();
        let start: Date;
        let end: Date;

        switch (key) {
            case 'hoje':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case '7dias':
                start = startOfDay(subDays(now, 7));
                end = endOfDay(now);
                break;
            case 'este_mes':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'mes_anterior': {
                const prevMonth = subMonths(now, 1);
                start = startOfMonth(prevMonth);
                end = endOfMonth(prevMonth);
                break;
            }
            case 'ano_atual':
                start = startOfYear(now);
                end = endOfYear(now);
                break;
            default:
                return;
        }

        onSelectRange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), key);
    };

    const shortcuts: { key: PeriodoShortcutKey; label: string }[] = [
        { key: 'hoje', label: 'Hoje' },
        { key: '7dias', label: '7 dias' },
        { key: 'este_mes', label: 'Este Mês' },
        { key: 'mes_anterior', label: 'Mês Anterior' },
        { key: 'ano_atual', label: 'Ano Atual' },
    ];

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {shortcuts.map((s) => (
                <Button
                    key={s.key}
                    type="button"
                    variant={activeShortcut === s.key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                        handleSelect(s.key);
                    }}
                    className={cn(
                        'h-7 rounded-lg px-2.5 text-xs transition-colors',
                        activeShortcut === s.key ? 'font-medium shadow-xs' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {s.label}
                </Button>
            ))}
        </div>
    );
};

export default PeriodoQuickShortcuts;
