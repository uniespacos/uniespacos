import { act, renderHook } from '@testing-library/react';
import { useMultiStepForm } from './useMultiStepForm';

describe('useMultiStepForm', () => {
    it('initializes with default step 0', () => {
        const { result } = renderHook(() => useMultiStepForm({ totalSteps: 3 }));
        expect(result.current.currentStep).toBe(0);
        expect(result.current.isFirstStep).toBe(true);
        expect(result.current.isLastStep).toBe(false);
        expect(result.current.totalSteps).toBe(3);
    });

    it('advances to next step and respects boundary', () => {
        const { result } = renderHook(() => useMultiStepForm({ totalSteps: 3 }));

        act(() => {
            result.current.nextStep();
        });
        expect(result.current.currentStep).toBe(1);
        expect(result.current.isFirstStep).toBe(false);
        expect(result.current.isLastStep).toBe(false);

        act(() => {
            result.current.nextStep();
        });
        expect(result.current.currentStep).toBe(2);
        expect(result.current.isLastStep).toBe(true);

        // Try to go beyond
        act(() => {
            result.current.nextStep();
        });
        expect(result.current.currentStep).toBe(2);
    });

    it('goes to previous step and respects boundary', () => {
        const { result } = renderHook(() => useMultiStepForm({ totalSteps: 3, initialStep: 2 }));

        expect(result.current.currentStep).toBe(2);
        expect(result.current.isLastStep).toBe(true);

        act(() => {
            result.current.prevStep();
        });
        expect(result.current.currentStep).toBe(1);

        act(() => {
            result.current.prevStep();
        });
        expect(result.current.currentStep).toBe(0);
        expect(result.current.isFirstStep).toBe(true);

        // Try to go below 0
        act(() => {
            result.current.prevStep();
        });
        expect(result.current.currentStep).toBe(0);
    });

    it('allows jumping to a specific valid step', () => {
        const { result } = renderHook(() => useMultiStepForm({ totalSteps: 3 }));

        act(() => {
            result.current.goToStep(1);
        });
        expect(result.current.currentStep).toBe(1);

        // Invalid step ignored
        act(() => {
            result.current.goToStep(5);
        });
        expect(result.current.currentStep).toBe(1);

        act(() => {
            result.current.goToStep(-1);
        });
        expect(result.current.currentStep).toBe(1);
    });
});
