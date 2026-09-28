import { render, screen, fireEvent } from '@testing-library/react';
import { GerenciarGestoresModal } from './GerenciarGestoresModal';
import type { Espaco, User } from '@/types';

const mockEspaco: Espaco = {
    id: 1,
    nome: 'Laboratório de Informática 1',
    instituicao_id: 1,
    capacidade: 30,
    ativo: true,
    agendas: [
        {
            id: 1,
            espaco_id: 1,
            turno: 'manha',
            user_id: 10,
            user: { id: 10, name: 'Gestor Manhã', email: 'manha@uesb.edu.br' } as User,
        },
        {
            id: 2,
            espaco_id: 1,
            turno: 'tarde',
            user_id: null,
            user: null,
        },
        {
            id: 3,
            espaco_id: 1,
            turno: 'noite',
            user_id: null,
            user: null,
        },
    ],
} as unknown as Espaco;

const mockUsuarios: User[] = [
    { id: 10, name: 'Gestor Manhã', email: 'manha@uesb.edu.br' } as User,
    { id: 20, name: 'Gestor Tarde', email: 'tarde@uesb.edu.br' } as User,
];

describe('GerenciarGestoresModal', () => {
    it('renders modal with space title and turnos when open', () => {
        render(<GerenciarGestoresModal espaco={mockEspaco} usuarios={mockUsuarios} isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />);

        expect(screen.getByText(/Gerenciar Gestores - Laboratório de Informática 1/i)).toBeInTheDocument();
        expect(screen.getByText('Manhã')).toBeInTheDocument();
        expect(screen.getByText('Tarde')).toBeInTheDocument();
        expect(screen.getByText('Noite')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });

    it('calls onClose when clicking cancel', () => {
        const onClose = jest.fn();
        render(<GerenciarGestoresModal espaco={mockEspaco} usuarios={mockUsuarios} isOpen={true} onClose={onClose} onSave={jest.fn()} />);

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onClose).toHaveBeenCalled();
    });

    it('returns null when espaco is null', () => {
        const { container } = render(
            <GerenciarGestoresModal espaco={null} usuarios={mockUsuarios} isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />,
        );

        expect(container.firstChild).toBeNull();
    });
});
