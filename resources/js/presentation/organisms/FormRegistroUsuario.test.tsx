import { render, screen, fireEvent } from '@testing-library/react';
import { FormRegistroUsuario } from './FormRegistroUsuario';
import type { Instituicao } from '@/types';

describe('FormRegistroUsuario', () => {
    const mockInstituicaos: Instituicao[] = [
        {
            id: 1,
            nome: 'UESB',
            sigla: 'UESB',
            endereco: 'Vitória da Conquista',
            setors: [
                {
                    id: 10,
                    nome: 'Informática',
                    sigla: 'INFO',
                    unidade: { id: 1, nome: 'DCET', sigla: 'DCET' },
                },
            ],
        },
    ];

    const defaultProps = {
        data: {
            name: 'João Silva',
            email: 'joao@uesb.edu.br',
            phone: '77999999999',
            password: '',
            password_confirmation: '',
            instituicao_id: '1',
            setor_id: '10',
        },
        onInputChange: jest.fn(),
        errors: {},
        processing: false,
        instituicaos: mockInstituicaos,
        onSubmit: jest.fn(),
    };

    it('renders step 1 (personal data) initially', () => {
        render(<FormRegistroUsuario {...defaultProps} />);

        expect(screen.getByDisplayValue('João Silva')).toBeInTheDocument();
        expect(screen.getByDisplayValue('joao@uesb.edu.br')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /próximo/i })).toBeInTheDocument();
    });

    it('navigates from step 1 to step 2 on next button click', () => {
        render(<FormRegistroUsuario {...defaultProps} />);

        const nextButton = screen.getByRole('button', { name: /próximo/i });
        fireEvent.click(nextButton);

        // Should now see step 2 heading
        expect(screen.getByRole('heading', { name: /vínculo institucional/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /voltar/i })).toBeInTheDocument();
    });

    it('navigates through all steps and submits on last step', () => {
        const onSubmit = jest.fn();
        const { container } = render(<FormRegistroUsuario {...defaultProps} onSubmit={onSubmit} />);
        const form = container.querySelector('form');
        expect(form).toBeInTheDocument();

        if (form) {
            // Step 1 -> Step 2
            fireEvent.submit(form);

            // Step 2 -> Step 3
            fireEvent.submit(form);

            // Step 3 should have finish button
            const submitButton = screen.getByRole('button', { name: /concluir cadastro/i });
            expect(submitButton).toBeInTheDocument();

            fireEvent.submit(form);
            expect(onSubmit).toHaveBeenCalledTimes(1);
        }
    });

    it('automatically jumps back to step 1 (Personal Data) when errors.email is returned from backend', () => {
        const { rerender } = render(<FormRegistroUsuario {...defaultProps} />);

        // User moves to step 3 (credentials)
        const nextButton = screen.getByRole('button', { name: /próximo/i });
        fireEvent.click(nextButton); // to step 2
        const nextButton2 = screen.getByRole('button', { name: /próximo/i });
        fireEvent.click(nextButton2); // to step 3

        expect(screen.getByRole('heading', { name: /credenciais de acesso/i })).toBeInTheDocument();

        // Backend returns error for duplicate email
        rerender(
            <FormRegistroUsuario
                {...defaultProps}
                errors={{ email: 'O e-mail informado já está em uso.' }}
            />
        );

        // Should automatically jump back to step 1
        expect(screen.getByText('O e-mail informado já está em uso.')).toBeInTheDocument();
        expect(screen.getByDisplayValue('joao@uesb.edu.br')).toBeInTheDocument();
    });
});
