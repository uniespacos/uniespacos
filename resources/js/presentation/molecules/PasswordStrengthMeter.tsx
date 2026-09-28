import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordStrengthMeterProps {
    password?: string;
    className?: string;
}

export interface PasswordRequirement {
    id: string;
    label: string;
    isValid: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '', className }) => {
    const requirements = useMemo<PasswordRequirement[]>(() => {
        return [
            { id: 'length', label: 'Pelo menos 8 caracteres', isValid: password.length >= 8 },
            { id: 'uppercase', label: 'Uma letra maiúscula', isValid: /[A-Z]/.test(password) },
            { id: 'lowercase', label: 'Uma letra minúscula', isValid: /[a-z]/.test(password) },
            { id: 'number', label: 'Pelo menos um número', isValid: /[0-9]/.test(password) },
            {
                id: 'symbol',
                label: 'Pelo menos um caractere especial (@$!%*?&#)',
                isValid: /[@$!%*?&#^()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password),
            },
        ];
    }, [password]);

    const passedCount = requirements.filter((r) => r.isValid).length;
    const strengthScore = (passedCount / requirements.length) * 100;

    let progressColor = 'bg-destructive';
    let strengthLabel = 'Fraca';

    if (passedCount >= 4) {
        progressColor = 'bg-success';
        strengthLabel = 'Forte';
    } else if (passedCount >= 3) {
        progressColor = 'bg-warning';
        strengthLabel = 'Média';
    }

    if (!password) {
        return null;
    }

    return (
        <div className={cn('space-y-2.5 pt-1.5', className)}>
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Força da senha:</span>
                    <span className="text-foreground font-semibold">{strengthLabel}</span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                        className={cn('h-full rounded-full transition-all duration-300', progressColor)}
                        style={{ width: `${strengthScore.toString()}%` }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-1 text-[11px] md:grid-cols-2">
                {requirements.map((req) => (
                    <div
                        key={req.id}
                        className={cn(
                            'flex items-center gap-1.5 transition-colors',
                            req.isValid ? 'text-success-accent font-medium' : 'text-muted-foreground',
                        )}
                    >
                        {req.isValid ? (
                            <Check className="text-success-accent h-3 w-3 shrink-0" />
                        ) : (
                            <X className="text-muted-foreground/60 h-3 w-3 shrink-0" />
                        )}
                        <span>{req.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
