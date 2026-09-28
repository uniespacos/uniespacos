import { render, screen } from '@testing-library/react';
import { ReservaInfoCard } from './ReservaInfoCard';
import type { Reserva, User } from '@/types';

jest.mock('@/i18n', () => ({
    useTranslation: () => ({
        formatDate: (date: Date | string) => {
            if (typeof date === 'string') {
                return new Date(date).toLocaleDateString('pt-BR');
            }
            return date.toLocaleDateString('pt-BR');
        },
        t: (key: string) => {
            const translations: Record<string, string> = {
                'reservas.detalhes.solicitante': 'Solicitante',
            };
            return translations[key] || key;
        },
    }),
}));

const baseUser = {
    id: 1,
    name: 'João Silva',
    email: 'joao@example.com',
    telefone: '(85) 9999-9999',
    email_verified_at: '2024-01-01',
    roles: [],
    permissions: [],
    setor_id: null,
    unread_notifications: [],
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
} as User;

const mockReservaWithContact = {
    id: 1,
    titulo: 'Reserva de Sala',
    descricao: 'Uma reserva de teste',
    situacao: 'deferida' as const,
    data_inicial: new Date('2024-12-01'),
    data_final: new Date('2024-12-02'),
    recorrencia: 'unica' as const,
    observacao: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    user: baseUser,
    horarios: [],
} satisfies Reserva;

const mockReservaWithoutContact = {
    id: 2,
    titulo: 'Reserva Sem Contato',
    descricao: 'Uma reserva sem dados de contato',
    situacao: 'deferida' as const,
    data_inicial: new Date('2024-12-01'),
    data_final: new Date('2024-12-02'),
    recorrencia: 'unica' as const,
    observacao: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    user: undefined,
    horarios: [],
} satisfies Reserva;

const mockReservaWithOnlyEmail = {
    ...mockReservaWithContact,
    id: 3,
    user: {
        ...baseUser,
        telefone: undefined,
    } as unknown as User,
} satisfies Reserva;

const mockReservaWithOnlyPhone = {
    ...mockReservaWithContact,
    id: 4,
    user: {
        ...baseUser,
        email: undefined,
    } as unknown as User,
} satisfies Reserva;

describe('ReservaInfoCard', () => {
    it('renders the reservation title', () => {
        render(<ReservaInfoCard reserva={mockReservaWithContact} />);

        expect(screen.getByText('Reserva de Sala')).toBeInTheDocument();
    });

    it('renders user name', () => {
        render(<ReservaInfoCard reserva={mockReservaWithContact} />);

        expect(screen.getByText(/João Silva/)).toBeInTheDocument();
    });

    it('displays email when user email is present', () => {
        render(<ReservaInfoCard reserva={mockReservaWithContact} />);

        expect(screen.getByText('joao@example.com')).toBeInTheDocument();
    });

    it('displays phone when user phone is present', () => {
        render(<ReservaInfoCard reserva={mockReservaWithContact} />);

        expect(screen.getByText('(85) 9999-9999')).toBeInTheDocument();
    });

    it('does not display email when user does not have email', () => {
        render(<ReservaInfoCard reserva={mockReservaWithOnlyPhone} />);

        expect(screen.queryByText('joao@example.com')).not.toBeInTheDocument();
        expect(screen.getByText('(85) 9999-9999')).toBeInTheDocument();
    });

    it('does not display phone when user does not have phone', () => {
        render(<ReservaInfoCard reserva={mockReservaWithOnlyEmail} />);

        expect(screen.getByText('joao@example.com')).toBeInTheDocument();
        expect(screen.queryByText('(85) 9999-9999')).not.toBeInTheDocument();
    });

    it('does not show contact section when user is undefined', () => {
        render(<ReservaInfoCard reserva={mockReservaWithoutContact} />);

        expect(screen.queryByText('joao@example.com')).not.toBeInTheDocument();
        expect(screen.queryByText('(85) 9999-9999')).not.toBeInTheDocument();
    });

    it('renders description content', () => {
        render(<ReservaInfoCard reserva={mockReservaWithContact} />);

        expect(screen.getByText('Uma reserva de teste')).toBeInTheDocument();
    });

    it('renders children when provided', () => {
        render(
            <ReservaInfoCard reserva={mockReservaWithContact}>
                <div>Child content</div>
            </ReservaInfoCard>
        );

        expect(screen.getByText('Child content')).toBeInTheDocument();
    });
});
