import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { useMultiStepForm } from '@/hooks/useMultiStepForm';
import { StepIndicator } from '@/presentation/molecules/StepIndicator';
import { RegisterStepPersonal } from '@/presentation/molecules/RegisterStepPersonal';
import { RegisterStepInstitution } from '@/presentation/molecules/RegisterStepInstitution';
import { RegisterStepCredentials } from '@/presentation/molecules/RegisterStepCredentials';
import type { Instituicao } from '@/types';
import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import React, { useCallback, useEffect } from 'react';

interface FormRegistroUsuarioProps {
    data: {
        name: string;
        email: string;
        phone: string;
        password: string;
        password_confirmation: string;
        instituicao_id: string;
        setor_id: string;
    };
    onInputChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    processing: boolean;
    instituicaos: Instituicao[];
    onSubmit: (e: React.SyntheticEvent) => void;
}

const TOTAL_STEPS = 3;

export function FormRegistroUsuario({ data, onInputChange, errors, processing, instituicaos, onSubmit }: FormRegistroUsuarioProps) {
    const { t } = useTranslation();
    const { currentStep, isFirstStep, isLastStep, nextStep, prevStep, goToStep } = useMultiStepForm({
        totalSteps: TOTAL_STEPS,
    });

    const stepHasError = useCallback(
        (stepIndex: number): boolean => {
            const errorKeys = Object.keys(errors);
            if (errorKeys.length === 0) return false;

            if (stepIndex === 0) {
                return errorKeys.some((k) => ['name', 'email', 'phone'].includes(k));
            }
            if (stepIndex === 1) {
                return errorKeys.some((k) => ['instituicao_id', 'setor_id', 'campus'].includes(k));
            }
            if (stepIndex === 2) {
                return errorKeys.some((k) => ['password', 'password_confirmation'].includes(k));
            }
            return false;
        },
        [errors]
    );

    // Pula automaticamente para a primeira etapa com erro quando o backend retorna erros de validação
    useEffect(() => {
        const errorKeys = Object.keys(errors);
        if (errorKeys.length === 0) return;

        if (stepHasError(0)) {
            goToStep(0);
        } else if (stepHasError(1)) {
            goToStep(1);
        } else if (stepHasError(2)) {
            goToStep(2);
        }
    }, [errors, goToStep, stepHasError]);

    const steps = [
        { label: t('auth.register.step_personal_label'), hasError: stepHasError(0) },
        { label: t('auth.register.step_institution_label'), hasError: stepHasError(1) },
        { label: t('auth.register.step_credentials_label'), hasError: stepHasError(2) },
    ];

    const handleFormSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (isLastStep) {
            onSubmit(e);
        } else {
            nextStep();
        }
    };

    return (
        <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Step Indicator com suporte a clique e indicação de erro */}
            <StepIndicator steps={steps} currentStep={currentStep} onStepClick={goToStep} />

            {/* Step Content — com transição */}
            <div className="animate-fade-in-up min-h-[200px]" key={currentStep}>
                {currentStep === 0 && (
                    <RegisterStepPersonal data={data} onInputChange={onInputChange} errors={errors} processing={processing} />
                )}

                {currentStep === 1 && (
                    <RegisterStepInstitution
                        instituicaos={instituicaos}
                        processing={processing}
                        onInstituicaoChange={(instId) => {
                            onInputChange('instituicao_id', instId);
                        }}
                        onSetorChange={(setorId) => {
                            onInputChange('setor_id', setorId);
                        }}
                        errors={errors}
                    />
                )}

                {currentStep === 2 && (
                    <RegisterStepCredentials data={data} onInputChange={onInputChange} errors={errors} processing={processing} />
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 pt-2">
                {!isFirstStep && (
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11 flex-1"
                        onClick={prevStep}
                        disabled={processing}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('auth.register.btn_back')}
                    </Button>
                )}

                <Button type="submit" className="h-12 flex-1 text-base font-medium" disabled={processing}>
                    {isLastStep ? (
                        processing ? (
                            <>
                                <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                                {t('auth.register.btn_submitting')}
                            </>
                        ) : (
                            t('auth.register.btn_finish')
                        )
                    ) : (
                        <>
                            {t('auth.register.btn_next')}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
}
