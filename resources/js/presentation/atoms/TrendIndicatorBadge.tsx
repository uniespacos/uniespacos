import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrendIndicatorBadgeProps {
    value: number; // Percentual, ex: 12.5 para +12.5% ou -5.2 para -5.2%
    isPositiveGood?: boolean; // Se true, aumento é verde (success); se false, aumento é amarelo/vermelho (warning/destructive)
    className?: string;
    suffix?: string;
    showSign?: boolean;
}

export const TrendIndicatorBadge: React.FC<TrendIndicatorBadgeProps> = ({
    value,
    isPositiveGood = true,
    className,
    suffix = '%',
    showSign = true,
}) => {
    const isZero = Math.abs(value) < 0.01;
    const isPositive = value > 0;

    let colorClasses = 'bg-muted text-muted-foreground';
    let Icon = Minus;

    if (!isZero) {
        if (isPositive) {
            Icon = TrendingUp;
            colorClasses = isPositiveGood ? 'bg-success-subtle text-success-accent' : 'bg-warning-subtle text-warning-accent';
        } else {
            Icon = TrendingDown;
            colorClasses = isPositiveGood ? 'bg-destructive-subtle text-destructive-accent' : 'bg-success-subtle text-success-accent';
        }
    }

    const formattedValue = isZero ? `0.0${suffix}` : `${showSign && isPositive ? '+' : ''}${value.toFixed(1)}${suffix}`;

    return (
        <span
            data-testid="trend-indicator-badge"
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-tight transition-colors',
                colorClasses,
                className,
            )}
        >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{formattedValue}</span>
        </span>
    );
};

export default TrendIndicatorBadge;
