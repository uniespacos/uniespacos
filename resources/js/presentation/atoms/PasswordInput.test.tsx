import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
    it('renders password input masked by default', () => {
        render(<PasswordInput placeholder="Digite sua senha" />);

        const input = screen.getByPlaceholderText('Digite sua senha');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles password visibility when clicking eye button', () => {
        render(<PasswordInput placeholder="Digite sua senha" />);

        const input = screen.getByPlaceholderText('Digite sua senha');
        const toggleButton = screen.getByRole('button', { name: /exibir senha/i });

        fireEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'text');

        const hideButton = screen.getByRole('button', { name: /ocultar senha/i });
        fireEvent.click(hideButton);
        expect(input).toHaveAttribute('type', 'password');
    });

    it('applies error styling when hasError is true', () => {
        render(<PasswordInput placeholder="Digite sua senha" hasError />);

        const input = screen.getByPlaceholderText('Digite sua senha');
        expect(input).toHaveClass('border-destructive');
    });
});
