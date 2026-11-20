import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { ReservaStepId, StepperStep } from '@/types/reserva-stepper';
import { Check } from 'lucide-react';
import React from 'react';

export interface StepperProgressProps {
    steps: StepperStep[];
    currentStepId: ReservaStepId;
    onStepClick?: (stepId: ReservaStepId) => void;
    className?: string;
}

export const StepperProgress: React.FC<StepperProgressProps> = ({ steps, currentStepId, onStepClick, className }) => {
    const { t } = useTranslation();
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);
    const passoAtual = currentIndex >= 0 ? steps[currentIndex] : undefined;

    return (
        <nav aria-label={t('reservas.stepper.steps_aria_label')} className={cn('w-full py-1', className)}>
            <ol className="flex w-full items-center justify-between">
                {steps.map((step, index) => {
                    const isCompleted = step.isCompleted || index < currentIndex;
                    const isCurrent = step.id === currentStepId;
                    const isClickable = Boolean(onStepClick && (isCompleted || isCurrent));

                    return (
                        <li key={step.id} className={cn('flex items-center', index < steps.length - 1 ? 'flex-1' : 'flex-initial')}>
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    disabled={!isClickable}
                                    onClick={() => {
                                        if (isClickable) {
                                            onStepClick?.(step.id);
                                        }
                                    }}
                                    aria-current={isCurrent ? 'step' : undefined}
                                    aria-label={t('reservas.stepper.step_aria_label', { n: String(index + 1), title: step.title })}
                                    className={cn(
                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 outline-none',
                                        isCurrent && 'bg-primary text-primary-foreground ring-primary/20 shadow-md ring-4',
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
                                            'text-sm leading-tight font-medium transition-colors',
                                            isCurrent
                                                ? 'text-foreground font-semibold'
                                                : isCompleted
                                                  ? 'text-foreground/90'
                                                  : 'text-muted-foreground',
                                        )}
                                    >
                                        {step.title}
                                    </span>
                                    <span className="text-muted-foreground mt-0.5 text-xs">{step.description}</span>
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

            {passoAtual && (
                <div className="mt-2.5 space-y-0.5 sm:hidden">
                    <p className="text-foreground text-sm font-medium">
                        {t('reservas.stepper.step_counter', {
                            current: String(currentIndex + 1),
                            total: String(steps.length),
                            title: passoAtual.title,
                        })}
                    </p>
                    <p className="text-muted-foreground text-xs">{passoAtual.description}</p>
                </div>
            )}
        </nav>
    );
};

export default StepperProgress;
