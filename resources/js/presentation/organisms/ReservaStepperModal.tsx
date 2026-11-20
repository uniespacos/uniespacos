import { Button } from '@/components/ui/button';
import { SituacaoReserva, type SituacaoReservaType } from '@/contracts';
import { useReservaStepper } from '@/hooks/useReservaStepper';
import { useTranslation } from '@/i18n';
import { assertNever } from '@/lib/utils/exhaustive';
import { ReservaRecorrenciaField } from '@/presentation/molecules/ReservaRecorrenciaField';
import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';
import { StepDadosJustificativa } from '@/presentation/molecules/StepDadosJustificativa';
import { StepHorariosRecorrencia } from '@/presentation/molecules/StepHorariosRecorrencia';
import { StepperProgress } from '@/presentation/molecules/StepperProgress';
import { StepRevisaoConfirmacao } from '@/presentation/molecules/StepRevisaoConfirmacao';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { router } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Send, X } from 'lucide-react';
import React, { SyntheticEvent, useCallback, useEffect } from 'react';

declare function route(name: string, params?: unknown): string;

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
    sucessoCriacao?: boolean;
    situacaoCriacao?: SituacaoReservaType;
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
    sucessoCriacao = false,
    situacaoCriacao = SituacaoReserva.EM_ANALISE,
}) => {
    const { t } = useTranslation();
    const {
        currentStepId,
        steps,
        isFirstStep,
        isLastStep,
        canAdvance,
        canSubmit,
        bloqueios,
        stepErrors,
        conflictingDates,
        conflictingSlotIds,
        hasAnyConflict,
        goToStep,
        nextStep,
        prevStep,
        resetStepper,
        removerSlotsEmConflito,
        onRealtimeSlotsConflict,
    } = useReservaStepper({
        espaco,
        formData,
        slotsSelecao,
        isEditMode,
        setSlotsSelecao,
    });

    useEffect(() => {
        if (isOpen) {
            resetStepper();
        }
    }, [isOpen, resetStepper]);

    const handleFormSubmit = useCallback(
        (e: SyntheticEvent) => {
            e.preventDefault();

            if (!isLastStep) {
                nextStep();
                return;
            }

            if (canSubmit) {
                onSubmit(e);
            }
        },
        [isLastStep, canSubmit, nextStep, onSubmit],
    );

    const modalTitle = isEditMode
        ? t('reservas.stepper.title_edit', { espaco: espaco.nome })
        : t('reservas.stepper.title_create', { espaco: espaco.nome });

    const footerButtonFocusClasses =
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

    if (sucessoCriacao) {
        const descricaoSucesso =
            situacaoCriacao === SituacaoReserva.DEFERIDA
                ? t('reservas.stepper.success_body_deferida')
                : situacaoCriacao === SituacaoReserva.PARCIALMENTE_DEFERIDA
                  ? t('reservas.stepper.success_body_parcialmente_deferida')
                  : t('reservas.stepper.success_body');

        return (
            <ResponsiveModal
                open={isOpen}
                onOpenChange={onOpenChange}
                size="md"
                title={t('reservas.stepper.success_title')}
                description={descricaoSucesso}
            >
                <div className="flex flex-col items-center gap-5 py-4 text-center">
                    <span className="bg-success-subtle text-success-accent flex h-14 w-14 items-center justify-center rounded-full">
                        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
                    </span>
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                router.get(route('reservas.index'));
                            }}
                            className={`h-10 px-4 text-sm ${footerButtonFocusClasses}`}
                        >
                            {t('reservas.stepper.success_my_reservations')}
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                onOpenChange(false);
                            }}
                            className={`h-10 px-4 text-sm ${footerButtonFocusClasses}`}
                        >
                            {t('reservas.stepper.success_new_request')}
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        );
    }

    const renderStepContent = () => {
        switch (currentStepId) {
            case 'detalhes':
                return (
                    <div className="space-y-6">
                        {(stepErrors.slots ?? stepErrors.data_inicial) && (
                            <p role="alert" className="text-destructive-accent text-sm font-medium">
                                {stepErrors.slots ?? stepErrors.data_inicial}
                            </p>
                        )}
                        <StepHorariosRecorrencia formData={formData} setFormData={setFormData} slotsSelecao={slotsSelecao} isEditMode={isEditMode} />
                        <StepDadosJustificativa
                            formData={formData}
                            setFormData={setFormData}
                            errors={stepErrors}
                            capacidade={espaco.capacidade_pessoas}
                        />
                        <ReservaRecorrenciaField
                            formData={formData}
                            setFormData={setFormData}
                            slotsSelecao={slotsSelecao}
                            hoje={hoje}
                            erro={stepErrors.data_final}
                        />
                    </div>
                );
            case 'revisao':
                return (
                    <div className="space-y-5">
                        {bloqueios.detalhes && (
                            <p role="alert" className="text-destructive-accent text-sm font-medium">
                                {t('reservas.stepper.errors.details_incomplete')}
                            </p>
                        )}
                        <StepRevisaoConfirmacao
                            espaco={espaco}
                            formData={formData}
                            setFormData={setFormData}
                            isEditMode={isEditMode}
                            slotsSelecao={slotsSelecao}
                            conflictingDates={conflictingDates}
                            temConflito={hasAnyConflict}
                            quantidadeEmConflito={conflictingSlotIds.length}
                            onRemoverConflitos={setSlotsSelecao ? removerSlotsEmConflito : undefined}
                            onRealtimeSlotsConflict={onRealtimeSlotsConflict}
                        />
                    </div>
                );
            default:
                return assertNever(currentStepId);
        }
    };

    const footerContent = (
        <div className="border-border flex w-full items-center justify-between gap-2 border-t pt-3">
            {isFirstStep ? (
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        onOpenChange(false);
                    }}
                    className={`h-10 gap-1.5 px-4 text-sm ${footerButtonFocusClasses}`}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t('common.actions.cancel')}
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSubmitting}
                    className={`h-10 gap-1.5 px-4 text-sm ${footerButtonFocusClasses}`}
                >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('common.actions.back')}
                </Button>
            )}

            {isLastStep ? (
                <Button
                    type="button"
                    onClick={handleFormSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className={`h-10 gap-1.5 px-5 text-sm font-semibold shadow-sm ${footerButtonFocusClasses}`}
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>{isEditMode ? t('common.actions.saving') : t('common.actions.submitting')}</span>
                        </>
                    ) : (
                        <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            <span>{isEditMode ? t('reservas.stepper.save_changes') : t('reservas.stepper.submit')}</span>
                        </>
                    )}
                </Button>
            ) : (
                <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canAdvance}
                    className={`h-10 gap-1.5 px-5 text-sm font-semibold shadow-sm ${footerButtonFocusClasses}`}
                >
                    <span>{t('common.actions.next')}</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
            )}
        </div>
    );

    return (
        <ResponsiveModal
            open={isOpen}
            onOpenChange={onOpenChange}
            size="2xl"
            title={modalTitle}
            description={currentStepId === 'detalhes' ? t('reservas.stepper.subtitle_detalhes') : t('reservas.stepper.subtitle_revisao')}
            footer={footerContent}
            className="sm:max-w-2xl"
        >
            <form onSubmit={handleFormSubmit} className="space-y-5">
                <StepperProgress steps={steps} currentStepId={currentStepId} onStepClick={goToStep} />

                <div className="max-h-[58dvh] min-h-[280px] overflow-y-auto px-0.5 py-1">{renderStepContent()}</div>
            </form>
        </ResponsiveModal>
    );
};

export default ReservaStepperModal;
