import { PERMISSION_ESPACOS_ATUALIZAR } from '@/constants/permissions';
import type { Espaco, User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import EspacoCard from './EspacoCard';

const mockPost = jest.fn();
const mockDelete = jest.fn();
const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
        post: (...args: unknown[]) => {
            mockPost(...args);
        },
        delete: (...args: unknown[]) => {
            mockDelete(...args);
        },
        prefetch: jest.fn(),
    },
    Link: ({
        children,
        href,
        className,
        onClick,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
        onClick?: React.MouseEventHandler;
        prefetch?: unknown;
    }) => (
        <a href={href} className={className} onClick={onClick}>
            {children}
        </a>
    ),
}));

const mockUser: User = {
    id: 1,
    name: 'Gestor Teste',
    email: 'gestor@uesb.edu.br',
    telefone: '77999999999',
    roles: ['gestor'],
    permissions: [PERMISSION_ESPACOS_ATUALIZAR],
    unread_notifications_count: 0,
    setor_id: 1,
    email_verified_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
};

const mockEspaco: Espaco = {
    id: 10,
    nome: 'Auditório Central',
    descricao: 'Auditório principal para eventos e palestras',
    capacidade_pessoas: 100,
    main_image_index: 'fotos/auditorio-1.jpg',
    is_favorited_by_user: false,
    andar: {
        id: 1,
        nome: 'andar-1',
        modulo_id: 2,
        tipo_acesso: [],
        modulo: {
            id: 2,
            nome: 'Módulo II',
            unidade_id: 1,
            unidade: {
                id: 1,
                nome: 'Campus Jequié',
                sigla: 'JQ',
            },
        },
    },
    imagens: ['fotos/auditorio-1.jpg'],
};

describe('EspacoCard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) =>
            typeof params === 'string' || typeof params === 'number'
                ? 'https://localhost/' + name + '/' + String(params)
                : 'https://localhost/' + name,
        );
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza corretamente as informações principais do espaço', () => {
        render(<EspacoCard espaco={mockEspaco} user={null} />);

        expect(screen.getByText('Auditório Central')).toBeInTheDocument();
        expect(screen.getByText('Auditório principal para eventos e palestras')).toBeInTheDocument();
        expect(screen.getByText('JQ')).toBeInTheDocument();
        expect(screen.getByText('Módulo II • 1º Andar')).toBeInTheDocument();
        expect(screen.getByText('100 pessoas')).toBeInTheDocument();
        expect(screen.getByText('Consultar horários')).toBeInTheDocument();
    });

    it('não expõe o card como botão e mantém o acesso por teclado no link "Consultar horários"', () => {
        const handleSolicitarReserva = jest.fn();
        render(<EspacoCard espaco={mockEspaco} user={null} handleSolicitarReserva={handleSolicitarReserva} />);

        expect(screen.queryByRole('button', { name: /Auditório Central/i })).not.toBeInTheDocument();

        const link = screen.getByRole('link', { name: /Consultar horários/i });
        fireEvent.click(link);

        expect(handleSolicitarReserva).toHaveBeenCalledTimes(1);
        expect(handleSolicitarReserva).toHaveBeenCalledWith('10');
    });

    it('não dispara o callback duas vezes ao clicar no link dentro do card', () => {
        const handleSolicitarReserva = jest.fn();
        render(<EspacoCard espaco={mockEspaco} user={null} handleSolicitarReserva={handleSolicitarReserva} />);

        fireEvent.click(screen.getByRole('link', { name: /Consultar horários/i }));

        expect(handleSolicitarReserva).toHaveBeenCalledTimes(1);
    });

    it('mostra o selo de horários livres no singular e no plural quando a listagem é filtrada por data', () => {
        const { rerender } = render(<EspacoCard espaco={{ ...mockEspaco, horarios_livres: 1 }} user={null} />);
        expect(screen.getByText('1 horário livre')).toBeInTheDocument();

        rerender(<EspacoCard espaco={{ ...mockEspaco, horarios_livres: 3 }} user={null} />);
        expect(screen.getByText('3 horários livres')).toBeInTheDocument();
    });

    it('não mostra selo de disponibilidade quando horarios_livres não vem definido', () => {
        render(<EspacoCard espaco={mockEspaco} user={null} />);

        expect(screen.queryByText(/horário livre|horários livres/)).not.toBeInTheDocument();
    });

    it('leva o link para a agenda na semana da data filtrada', () => {
        render(<EspacoCard espaco={{ ...mockEspaco, horarios_livres: 2 }} user={null} semanaDestino="2026-11-20" />);

        expect(screen.getByRole('link', { name: /Consultar horários/i })).toHaveAttribute('href', '/espacos/10?semana=2026-11-20');
    });

    it('navega para a agenda na semana da data filtrada ao clicar no card sem callback próprio', () => {
        render(<EspacoCard espaco={mockEspaco} user={null} semanaDestino="2026-11-20" />);

        fireEvent.click(screen.getByText('Auditório Central'));

        expect(mockGet).toHaveBeenCalledWith('/espacos/10?semana=2026-11-20');
    });

    it('dispara callback ao clicar no card de usuário comum', () => {
        const handleSolicitarReserva = jest.fn();
        render(<EspacoCard espaco={mockEspaco} user={null} handleSolicitarReserva={handleSolicitarReserva} />);

        const cardTitle = screen.getByText('Auditório Central');
        fireEvent.click(cardTitle);

        expect(handleSolicitarReserva).toHaveBeenCalledWith('10');
    });

    it('alterna status de favorito ao clicar no botão de coração', () => {
        render(<EspacoCard espaco={mockEspaco} user={null} />);

        const favoriteBtn = screen.getByLabelText('Adicionar aos Favoritos');
        expect(favoriteBtn).toBeInTheDocument();

        fireEvent.click(favoriteBtn);
        expect(mockPost).toHaveBeenCalledWith('https://localhost/espacos.favoritar/10', {}, expect.any(Object));
    });

    it('renderiza botões de gerenciamento quando isGerenciarEspacos está ativo e usuário tem permissão', () => {
        const handleEditar = jest.fn();
        const handleExcluir = jest.fn();
        const handleDetalhes = jest.fn();

        render(
            <EspacoCard
                espaco={mockEspaco}
                user={mockUser}
                isGerenciarEspacos={true}
                handleEditarEspaco={handleEditar}
                handleExcluirEspaco={handleExcluir}
                handleSolicitarReserva={handleDetalhes}
            />,
        );

        expect(screen.getByRole('button', { name: 'Detalhes' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Editar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Excluir/i })).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
        expect(handleEditar).toHaveBeenCalledWith('10');

        fireEvent.click(screen.getByRole('button', { name: /Excluir/i }));
        expect(handleExcluir).toHaveBeenCalledWith('10');

        fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }));
        expect(handleDetalhes).toHaveBeenCalledWith('10');
    });
});
