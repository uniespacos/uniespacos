import { useCallback, useState } from 'react';

interface UseMultiStepFormOptions {
    totalSteps: number;
    initialStep?: number;
}

interface UseMultiStepFormReturn {
    currentStep: number;
    totalSteps: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    nextStep: () => void;
    prevStep: () => void;
    goToStep: (step: number) => void;
}

export function useMultiStepForm({ totalSteps, initialStep = 0 }: UseMultiStepFormOptions): UseMultiStepFormReturn {
    const [currentStep, setCurrentStep] = useState(initialStep);

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    const nextStep = useCallback(() => {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    }, [totalSteps]);

    const prevStep = useCallback(() => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
    }, []);

    const goToStep = useCallback(
        (step: number) => {
            if (step >= 0 && step < totalSteps) {
                setCurrentStep(step);
            }
        },
        [totalSteps],
    );

    return {
        currentStep,
        totalSteps,
        isFirstStep,
        isLastStep,
        nextStep,
        prevStep,
        goToStep,
    };
}
