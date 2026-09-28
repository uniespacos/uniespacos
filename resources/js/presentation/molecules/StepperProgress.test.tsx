import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepperProgress } from './StepperProgress';
import { StepperStep } from '@/types/reserva-stepper';

describe('StepperProgress', () => {
    const mockSteps: StepperStep[] = [
        {
            id: 'horarios_recorrencia',
            title: 'Horários',
            description: 'Período e frequência',
            isValid: true,
            isCompleted: true,
        },
        {
            id: 'dados_justificativa',
            title: 'Dados',
            description: 'Finalidade',
            isValid: true,
            isCompleted: false,
        },
        {
            id: 'revisao_confirmacao',
            title: 'Revisão',
            description: 'Confirmação',
            isValid: false,
            isCompleted: false,
        },
    ];

    it('renders all step titles and active step correctly', () => {
        render(<StepperProgress steps={mockSteps} currentStepId="dados_justificativa" />);

        expect(screen.getByText('Horários')).toBeInTheDocument();
        expect(screen.getByText('Dados')).toBeInTheDocument();
        expect(screen.getByText('Revisão')).toBeInTheDocument();

        const activeButton = screen.getByLabelText('Passo 2: Dados');
        expect(activeButton).toHaveAttribute('aria-current', 'step');
    });

    it('triggers onStepClick when clicking a completed or current step', () => {
        const handleStepClick = jest.fn();
        render(<StepperProgress steps={mockSteps} currentStepId="dados_justificativa" onStepClick={handleStepClick} />);

        const step1Button = screen.getByLabelText('Passo 1: Horários');
        fireEvent.click(step1Button);
        expect(handleStepClick).toHaveBeenCalledWith('horarios_recorrencia');
    });

    it('does not trigger onStepClick for uncompleted future steps', () => {
        const handleStepClick = jest.fn();
        render(<StepperProgress steps={mockSteps} currentStepId="dados_justificativa" onStepClick={handleStepClick} />);

        const step3Button = screen.getByLabelText('Passo 3: Revisão');
        expect(step3Button).toBeDisabled();
        fireEvent.click(step3Button);
        expect(handleStepClick).not.toHaveBeenCalled();
    });
});
