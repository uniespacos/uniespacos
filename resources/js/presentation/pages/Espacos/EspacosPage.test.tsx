import type { Espaco, User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import EspacosPage from './EspacosPage';

const mockGet = jest.fn();
let mockPageProps: Record<string, unknown> = {};

jest.mock('@inertiajs/react', () => ({
    Head: () => null,
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
    usePage: () => ({ props: mockPageProps }),
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@/presentation/organisms/EspacoFiltroBusca', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/presentation/molecules/PaginacaoListas', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/presentation/organisms/EspacoCard', () => ({
    __esModule: true,
    default: ({
        espaco,
        handleSolicitarReserva,
        semanaDestino,
    }: {
        espaco: Espaco;
        handleSolicitarReserva?: (espacoId: string) => void;
        semanaDestino?: string;
    }) => (
        <button
            type="button"
            data-semana={semanaDestino ?? ''}
            onClick={() => {
                handleSolicitarReserva?.(String(espaco.id));
            }}
        >
            {espaco.nome}
        </button>
    ),
}));

const mockUser: User = {
    id: 1,
    name: 'Usuário Teste',
    email: 'usuario@uesb.edu.br',
    telefone: '77999999999',
    roles: ['comum'],
    permissions: [],
    unread_notifications_count: 0,
    setor_id: null,
    email_verified_at: '2026-01-01',
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
};

const mockEspaco: Espaco = {
    id: 10,
    nome: 'Auditório Central',
    descricao: '',
    capacidade_pessoas: 100,
    main_image_index: null,
    imagens: [],
    horarios_livres: 2,
};

function definirPaginaComFiltros({ filters, espacos = [mockEspaco] }: { filters: Record<string, string>; espacos?: Espaco[] }) {
    mockPageProps = {
        andares: [],
        modulos: [],
        unidades: [],
        user: mockUser,
        espacos: { data: espacos, links: [], meta: {} },
        filters,
    };
}

describe('EspacosPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) =>
            typeof params === 'string' || typeof params === 'number' ? `https://localhost/${name}/${String(params)}` : `https://localhost/${name}`,
        );
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('mostra o resumo de disponibilidade com data e turno filtrados', () => {
        definirPaginaComFiltros({ filters: { data: '2026-11-20', turno: 'tarde' } });

        render(<EspacosPage />);

        expect(screen.getByText('Mostrando espaços com horário livre em sex, 20/11 (tarde)')).toBeInTheDocument();
    });

    it('mostra o resumo sem turno quando apenas a data está filtrada', () => {
        definirPaginaComFiltros({ filters: { data: '2026-11-20' } });

        render(<EspacosPage />);

        expect(screen.getByText('Mostrando espaços com horário livre em sex, 20/11')).toBeInTheDocument();
    });

    it('não mostra resumo de disponibilidade sem data', () => {
        definirPaginaComFiltros({ filters: {} });

        render(<EspacosPage />);

        expect(screen.queryByText(/Mostrando espaços com horário livre/)).not.toBeInTheDocument();
    });

    it('leva a agenda do espaço para a semana da data filtrada ao solicitar reserva', () => {
        definirPaginaComFiltros({ filters: { data: '2026-11-20', turno: 'manha' } });

        render(<EspacosPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Auditório Central' }));

        expect(mockGet).toHaveBeenCalledWith('https://localhost/espacos.show/10', { semana: '2026-11-20' });
        expect(screen.getByRole('button', { name: 'Auditório Central' })).toHaveAttribute('data-semana', '2026-11-20');
    });

    it('abre a agenda sem semana quando não há data filtrada', () => {
        definirPaginaComFiltros({ filters: {} });

        render(<EspacosPage />);
        fireEvent.click(screen.getByRole('button', { name: 'Auditório Central' }));

        expect(mockGet).toHaveBeenCalledWith('https://localhost/espacos.show/10', {});
    });

    it('oferece limpar filtros no estado vazio quando há data filtrada', () => {
        definirPaginaComFiltros({ filters: { data: '2026-11-20' }, espacos: [] });

        render(<EspacosPage />);

        expect(screen.getByRole('button', { name: /Limpar filtros/i })).toBeInTheDocument();
    });

    it('não oferece limpar filtros no estado vazio quando nenhum filtro está ativo', () => {
        definirPaginaComFiltros({ filters: {}, espacos: [] });

        render(<EspacosPage />);

        expect(screen.queryByRole('button', { name: /Limpar filtros/i })).not.toBeInTheDocument();
    });
});
