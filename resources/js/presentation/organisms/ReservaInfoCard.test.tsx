import type { Reserva, User } from '@/types';
import { render, screen } from '@testing-library/react';
import { ReservaInfoCard } from './ReservaInfoCard';

jest.mock('@/i18n', () => ({
    useTranslation: () => ({
        formatDate: (date: Date | string) => {
            if (typeof date === 'string') {
                return new Date(date).toLocaleDateString('pt-BR');
            }
            return date.toLocaleDateString('pt-BR');
        },
        t: (key: string, params?: Record<string, string>) => {
            const translations: Record<string, string> = {
                'reservas.detalhes.solicitante': 'Solicitante',
                'reservas.detalhes.periodo': 'Período',
                'reservas.detalhes.descricao': 'Descrição',
                'reservas.detalhes.publico_estimado': 'Público estimado',
                'reservas.detalhes.publico_de_capacidade': 'de {{count}} lugares',
                'reservas.detalhes.categoria': 'Categoria',
                'reservas.stepper.period_to': 'até',
                'espacos.pessoas': '{{count}} pessoas',
            };
            return (translations[key] || key).replace('{{count}}', params?.count ?? '');
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
    unread_notifications_count: 0,
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

    it('preserva quebras de linha na descricao (W-08)', () => {
        const reservaMultilinha: Reserva = {
            ...mockReservaWithContact,
            descricao: 'Primeira linha\nSegunda linha',
        };

        render(<ReservaInfoCard reserva={reservaMultilinha} />);

        const descricaoEl = screen.getByText(/Primeira linha/);
        expect(descricaoEl).toHaveClass('whitespace-pre-wrap');
        expect(descricaoEl.textContent).toBe('Primeira linha\nSegunda linha');
    });

    it('renders children when provided', () => {
        render(
            <ReservaInfoCard reserva={mockReservaWithContact}>
                <div>Child content</div>
            </ReservaInfoCard>,
        );

        expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('exibe público estimado comparado à capacidade do espaço e a categoria quando informados', () => {
        const reserva = {
            ...mockReservaWithContact,
            publico_estimado: 80,
            categoria: 'Palestra',
            horarios: [{ agenda: { espaco: { capacidade_pessoas: 100 } } }] as unknown as Reserva['horarios'],
        } satisfies Reserva;

        render(<ReservaInfoCard reserva={reserva} />);

        expect(screen.getByText('Público estimado')).toBeInTheDocument();
        expect(screen.getByText('80 pessoas')).toBeInTheDocument();
        expect(screen.getByText(/de 100 lugares/)).toBeInTheDocument();
        expect(screen.getByText('Categoria')).toBeInTheDocument();
        expect(screen.getByText('Palestra')).toBeInTheDocument();
    });

    it('não exibe público estimado nem categoria quando são nulos', () => {
        const reserva = {
            ...mockReservaWithContact,
            publico_estimado: null,
            categoria: null,
        } satisfies Reserva;

        render(<ReservaInfoCard reserva={reserva} />);

        expect(screen.queryByText('Público estimado')).not.toBeInTheDocument();
        expect(screen.queryByText('Categoria')).not.toBeInTheDocument();
    });

    it('omite a comparação de capacidade quando o payload não traz o espaço', () => {
        const reserva = {
            ...mockReservaWithContact,
            publico_estimado: 30,
        } satisfies Reserva;

        render(<ReservaInfoCard reserva={reserva} />);

        expect(screen.getByText('30 pessoas')).toBeInTheDocument();
        expect(screen.queryByText(/de \d+ lugares/)).not.toBeInTheDocument();
    });

    it('envolve titulo continuo com min-w-0 e classes de quebra para evitar estouro horizontal em flex (A-07)', () => {
        const tituloContinuo = 'A'.repeat(150);
        const { container } = render(
            <ReservaInfoCard
                reserva={{
                    ...mockReservaWithContact,
                    titulo: tituloContinuo,
                }}
            />,
        );

        const titleSpan = screen.getByText(tituloContinuo);
        const cardTitle = titleSpan.closest('[data-slot="card-title"]');
        const card = container.querySelector('[data-slot="card"]');

        expect(titleSpan.tagName).toBe('SPAN');
        expect(titleSpan).toHaveClass('min-w-0', 'break-words', '[overflow-wrap:anywhere]');
        expect(cardTitle).toHaveClass('min-w-0');
        expect(card).toHaveClass('min-w-0');
    });

    it('formata conector do periodo usando chave de traducao reservas.stepper.period_to', () => {
        render(
            <ReservaInfoCard
                reserva={{
                    ...mockReservaWithContact,
                    data_inicial: new Date(2027, 2, 11),
                    data_final: new Date(2027, 2, 18),
                }}
            />,
        );

        expect(screen.getByText(/11\/03\/2027 até 18\/03\/2027/)).toBeInTheDocument();
    });
});
