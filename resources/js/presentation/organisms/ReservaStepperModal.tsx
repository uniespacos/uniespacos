import React, { SyntheticEvent, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';
import { StepperProgress } from '@/presentation/molecules/StepperProgress';
import { StepHorariosRecorrencia } from '@/presentation/molecules/StepHorariosRecorrencia';
import { StepDadosJustificativa } from '@/presentation/molecules/StepDadosJustificativa';
import { StepRevisaoConfirmacao } from '@/presentation/molecules/StepRevisaoConfirmacao';
import { assertNever } from '@/lib/utils/exhaustive';
import { useReservaStepper } from '@/hooks/useReservaStepper';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { useTranslation } from '@/i18n';

export interface ReservaStepperModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (e: SyntheticEvent) => void;
    slotsSelecao: SlotCalendario[];
    hoje: Date;
    isSubmitting: boolean;
    isEditMode?: boolean;
    espaco: Espaco;
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    setSlotsSelecao?: (slots: SlotCalendario[]) => void;
}

export const ReservaStepperModal: React.FC<ReservaStepperModalProps> = ({
    isOpen,
    onOpenChange,
    onSubmit,
    slotsSelecao,
    hoje,
    isSubmitting,
    isEditMode = false,
    espaco,
    formData,
    setFormData,
    setSlotsSelecao,
}) => {
    const { t } = useTranslation();
    const {
        currentStepId,
        steps,
        isFirstStep,
        isLastStep,
        canAdvance,
        stepErrors,
        conflictingDates,
        goToStep,
        nextStep,
        prevStep,
        resetStepper,
        onConflictDetected,
    } = useReservaStepper({
        espaco,
        formData,
        slotsSelecao,
        isEditMode,
    });

    useEffect(() => {
        if (isOpen) {
            resetStepper();
        }
    }, [isOpen, resetStepper]);

    const handleFormSubmit = useCallback(
        (e: SyntheticEvent) => {
            e.preventDefault();
            if (isLastStep) {
                onSubmit(e);
            } else {
                nextStep();
            }
        },
        [isLastStep, onSubmit, nextStep],
    );

    const renderStepContent = () => {
        switch (currentStepId) {
            case 'horarios_recorrencia':
                return (
                    <StepHorariosRecorrencia
                        espaco={espaco}
                        formData={formData}
                        setFormData={setFormData}
                        slotsSelecao={slotsSelecao}
                        hoje={hoje}
                        isEditMode={isEditMode}
                        conflictingDates={conflictingDates}
                        onConflictDetected={onConflictDetected}
                        setSlotsSelecao={setSlotsSelecao}
                    />
                );
            case 'dados_justificativa':
                return <StepDadosJustificativa formData={formData} setFormData={setFormData} errors={stepErrors} />;
            case 'revisao_confirmacao':
                return (
                    <StepRevisaoConfirmacao
                        espaco={espaco}
                        formData={formData}
                        setFormData={setFormData}
                        slotsSelecao={slotsSelecao}
                        isEditMode={isEditMode}
                    />
                );
            default:
                return assertNever(currentStepId);
        }
    };

    const footerContent = (
        <div className="border-border flex w-full items-center justify-between gap-2 border-t pt-2">
            {isFirstStep ? (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        onOpenChange(false);
                    }}
                    className="h-9 px-3 text-xs"
                >
                    <X className="mr-1 h-3.5 w-3.5" />
                    {t('common.actions.cancel')}
                </Button>
            ) : (
                <Button type="button" variant="outline" size="sm" onClick={prevStep} disabled={isSubmitting} className="h-9 gap-1.5 px-3 text-xs">
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t('common.actions.back')}
                </Button>
            )}

            <div className="flex items-center gap-2">
                {!isLastStep ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={nextStep}
                        disabled={!canAdvance}
                        className="h-9 gap-1.5 px-4 text-xs font-medium shadow-sm"
                    >
                        <span>Avançar</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                ) : (
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!canAdvance || isSubmitting}
                        onClick={onSubmit}
                        className="h-9 gap-1.5 px-4 text-xs font-medium shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>{isEditMode ? t('reservas.stepper.saving') : t('reservas.stepper.submitting')}</span>
                            </>
                        ) : (
                            <>
                                <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>{isEditMode ? t('reservas.stepper.save_changes') : t('reservas.stepper.submit')}</span>
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );

    const modalTitle = isEditMode ? `Editar Solicitação — ${espaco.nome}` : `Solicitar Reserva — ${espaco.nome}`;

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            title={modalTitle}
            description={t('reservas.stepper.step1_subtitle')}
            footer={footerContent}
            className="sm:max-w-2xl"
        >
            <form onSubmit={handleFormSubmit} className="space-y-5">
                <div className="border-border border-b pb-3">
                    <StepperProgress steps={steps} currentStepId={currentStepId} onStepClick={goToStep} />
                </div>

                <div className="max-h-[58vh] min-h-[280px] overflow-y-auto px-0.5 py-1">{renderStepContent()}</div>
            </form>
        </ResponsiveModal>
    );
};

export default ReservaStepperModal;
