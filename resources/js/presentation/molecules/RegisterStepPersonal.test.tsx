import { render, screen } from '@testing-library/react';
import { RegisterStepPersonal } from './RegisterStepPersonal';

describe('RegisterStepPersonal', () => {
    const props = {
        data: { name: '', email: '', phone: '' },
        onInputChange: jest.fn(),
        errors: {},
        processing: false,
    };

    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('shows the purpose of the phone number', () => {
        render(<RegisterStepPersonal {...props} />);

        expect(screen.getByText(/Usado só como contato de emergência sobre suas reservas; visível apenas ao gestor do espaço\./)).toBeInTheDocument();
    });

    it('links to the privacy policy in a new tab', () => {
        render(<RegisterStepPersonal {...props} />);

        const link = screen.getByRole('link', { name: /política de privacidade/i });
        expect(link).toHaveAttribute('href', 'privacidade');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
});
