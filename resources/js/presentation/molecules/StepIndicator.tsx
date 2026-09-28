import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
    steps: { label: string; hasError?: boolean }[];
    currentStep: number;
    onStepClick?: (stepIndex: number) => void;
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
    return (
        <nav aria-label="Progresso do cadastro" className="w-full">
            <ol className="flex items-center justify-between gap-2">
                {steps.map((step, index) => {
                    const isCompleted = index < currentStep;
                    const isActive = index === currentStep;
                    const hasError = !!step.hasError;

                    return (
                        <li key={step.label} className="flex flex-1 flex-col items-center gap-2">
                            <div className="flex w-full items-center">
                                {/* Linha antes (exceto no primeiro) */}
                                {index > 0 && (
                                    <div
                                        className={cn(
                                            'h-0.5 flex-1 transition-colors duration-300',
                                            isCompleted || isActive ? 'bg-primary' : 'bg-border',
                                        )}
                                    />
                                )}

                                {/* Círculo do step */}
                                <button
                                    type="button"
                                    disabled={!onStepClick}
                                    onClick={() => onStepClick?.(index)}
                                    className={cn(
                                        'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300',
                                        hasError && 'bg-destructive text-destructive-foreground ring-destructive/20 ring-4',
                                        !hasError && isCompleted && 'bg-success text-success-foreground',
                                        !hasError && isActive && 'bg-primary text-primary-foreground ring-primary/20 ring-4',
                                        !hasError && !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                                        onStepClick && 'cursor-pointer',
                                    )}
                                    aria-current={isActive ? 'step' : undefined}
                                >
                                    {hasError ? <AlertCircle className="size-4" /> : isCompleted ? <Check className="size-4" /> : index + 1}
                                </button>

                                {/* Linha depois (exceto no último) */}
                                {index < steps.length - 1 && (
                                    <div className={cn('h-0.5 flex-1 transition-colors duration-300', isCompleted ? 'bg-primary' : 'bg-border')} />
                                )}
                            </div>

                            {/* Label do step */}
                            <span
                                className={cn(
                                    'text-center text-xs transition-colors duration-300',
                                    hasError ? 'text-destructive-accent font-medium' : isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                                )}
                            >
                                {step.label}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
