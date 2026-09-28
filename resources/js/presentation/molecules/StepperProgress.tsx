import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReservaStepId, StepperStep } from '@/types/reserva-stepper';

export interface StepperProgressProps {
    steps: StepperStep[];
    currentStepId: ReservaStepId;
    onStepClick?: (stepId: ReservaStepId) => void;
    className?: string;
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ steps, currentStepId, onStepClick, className }) => {
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);

    return (
        <nav aria-label="Etapas da solicitação de reserva" className={cn('w-full py-2', className)}>
            <ol className="flex w-full items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = step.isCompleted || index < currentIndex;
                    const isCurrent = step.id === currentStepId;
                    const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

                    return (
                        <li key={step.id} className={cn('flex items-center', index < steps.length - 1 ? 'flex-1' : 'flex-initial')}>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!isClickable}
                                    onClick={() => {
                                        if (isClickable) {
                                            onStepClick?.(step.id);
                                        }
                                    }}
                                    aria-current={isCurrent ? 'step' : undefined}
                                    aria-label={`Passo ${String(index + 1)}: ${step.title}`}
                                    className={cn(
                                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 outline-none',
                                        isCurrent && 'bg-primary text-primary-foreground ring-primary/20 scale-105 shadow-md ring-4',
                                        isCompleted &&
                                            !isCurrent &&
                                            'bg-primary/15 text-primary border-primary/30 hover:bg-primary/25 cursor-pointer border',
                                        !isCompleted && !isCurrent && 'bg-muted/60 text-muted-foreground border-border cursor-not-allowed border',
                                        isClickable && 'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2',
                                    )}
                                >
                                    {isCompleted && !isCurrent ? (
                                        <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                                    ) : (
                                        <span>{index + 1}</span>
                                    )}
                                </button>

                                <div className="hidden flex-col text-left sm:flex">
                                    <span
                                        className={cn(
                                            'text-xs leading-none font-medium transition-colors',
                                            isCurrent
                                                ? 'text-foreground font-semibold'
                                                : isCompleted
                                                  ? 'text-foreground/90'
                                                  : 'text-muted-foreground',
                                        )}
                                    >
                                        {step.title}
                                    </span>
                                    <span className="text-muted-foreground mt-0.5 line-clamp-1 text-[10px]">{step.description}</span>
                                </div>
                            </div>

                            {index < steps.length - 1 && (
                                <div
                                    className={cn(
                                        'mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300 sm:mx-4',
                                        index < currentIndex ? 'bg-primary' : 'bg-border',
                                    )}
                                    aria-hidden="true"
                                />
                            )}
                        </li>
                    );
                })}
            </ol>

            {/* Subtítulo do passo ativo exibido exclusivamente em telas pequenas (mobile) */}
            <div className="mt-2.5 flex items-center justify-between px-1 text-xs sm:hidden">
                <span className="text-foreground font-medium">
                    Passo {String(currentIndex + 1)} de {String(steps.length)}: {steps[currentIndex]?.title}
                </span>
                <span className="text-muted-foreground text-[11px]">{steps[currentIndex]?.description}</span>
            </div>
        </nav>
    );
};

export default StepperProgress;
