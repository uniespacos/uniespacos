import { render, screen, fireEvent } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
    const steps = [{ label: 'Dados Pessoais' }, { label: 'Vínculo Institucional' }, { label: 'Credenciais' }];

    it('renders all step labels', () => {
        render(<StepIndicator steps={steps} currentStep={0} />);

        expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
        expect(screen.getByText('Vínculo Institucional')).toBeInTheDocument();
        expect(screen.getByText('Credenciais')).toBeInTheDocument();
    });

    it('marks the active step with aria-current="step"', () => {
        render(<StepIndicator steps={steps} currentStep={1} />);

        const activeStep = screen.getByRole('button', { name: '2' });
        expect(activeStep).toHaveAttribute('aria-current', 'step');
    });

    it('renders navigation with proper accessibility label', () => {
        render(<StepIndicator steps={steps} currentStep={0} />);

        const nav = screen.getByRole('navigation', { name: /progresso do cadastro/i });
        expect(nav).toBeInTheDocument();
    });

    it('supports onStepClick when provided', () => {
        const onStepClick = jest.fn();
        render(<StepIndicator steps={steps} currentStep={0} onStepClick={onStepClick} />);

        const step2Button = screen.getByRole('button', { name: '2' });
        fireEvent.click(step2Button);

        expect(onStepClick).toHaveBeenCalledWith(1);
    });
});
