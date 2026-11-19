import { StepperStep } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepperProgress } from './StepperProgress';

describe('StepperProgress', () => {
    const steps: StepperStep[] = [
        { id: 'detalhes', title: 'Detalhes', description: 'O que vai acontecer', isCompleted: false, isValid: true },
        { id: 'revisao', title: 'Revisar', description: 'Conferência e envio', isCompleted: false, isValid: false },
    ];

    it('renderiza os dois passos e marca o passo atual com aria-current', () => {
        render(<StepperProgress steps={steps} currentStepId="detalhes" />);

        expect(screen.getByRole('navigation', { name: 'Etapas da solicitação de reserva' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Passo 1: Detalhes' })).toHaveAttribute('aria-current', 'step');
        expect(screen.getByRole('button', { name: 'Passo 2: Revisar' })).not.toHaveAttribute('aria-current');
    });

    it('mostra o contador de passo para telas pequenas', () => {
        render(<StepperProgress steps={steps} currentStepId="revisao" />);

        expect(screen.getByText('Passo 2 de 2: Revisar')).toBeInTheDocument();
    });

    it('dispara onStepClick ao clicar no passo atual ou concluído', () => {
        const onStepClick = jest.fn();
        const stepsConcluidos = steps.map((step) => ({ ...step, isCompleted: step.id === 'detalhes' }));

        render(<StepperProgress steps={stepsConcluidos} currentStepId="revisao" onStepClick={onStepClick} />);

        fireEvent.click(screen.getByRole('button', { name: 'Passo 1: Detalhes' }));
        expect(onStepClick).toHaveBeenCalledWith('detalhes');

        fireEvent.click(screen.getByRole('button', { name: 'Passo 2: Revisar' }));
        expect(onStepClick).toHaveBeenCalledWith('revisao');
    });

    it('desabilita passo futuro não concluído', () => {
        const onStepClick = jest.fn();

        render(<StepperProgress steps={steps} currentStepId="detalhes" onStepClick={onStepClick} />);

        const passoRevisao = screen.getByRole('button', { name: 'Passo 2: Revisar' });
        expect(passoRevisao).toBeDisabled();

        fireEvent.click(passoRevisao);
        expect(onStepClick).not.toHaveBeenCalled();
    });
});
