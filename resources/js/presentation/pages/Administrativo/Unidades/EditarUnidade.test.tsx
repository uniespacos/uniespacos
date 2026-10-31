import type { BreadcrumbItem } from '@/types';
import { useForm } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import EditarUnidadePage from './EditarUnidade';

let mockSiglaUnidade: string | null = 'JQ';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            instituicao: {
                id: 1,
                nome: 'Universidade Estadual do Sudoeste da Bahia',
                sigla: 'UESB',
                endereco: 'Estrada do Bem Querer, km 04',
            },
            unidade: {
                id: 2,
                nome: 'Campus Jequié',
                sigla: mockSiglaUnidade,
                instituicao: { id: 1, nome: 'Universidade Estadual do Sudoeste da Bahia', sigla: 'UESB', endereco: '' },
            },
        },
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    useForm: jest.fn(() => ({
        data: { nome: 'Campus Jequié', sigla: 'JQ', instituicao_id: '1' },
        setData: jest.fn(),
        put: jest.fn(),
        processing: false,
        errors: {},
    })),
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children, breadcrumbs }: { children: React.ReactNode; breadcrumbs?: BreadcrumbItem[] }) => (
        <div>
            {breadcrumbs?.map((bc) => (
                <a key={bc.href} data-testid="bc" href={bc.href}>
                    {bc.title}
                </a>
            ))}
            {children}
        </div>
    ),
}));

jest.mock('@/presentation/molecules/GenericHeader', () => ({
    __esModule: true,
    default: ({ titulo, descricao }: { titulo: string; descricao: string }) => (
        <div>
            {titulo} - {descricao}
        </div>
    ),
}));

jest.mock('@/presentation/organisms/UnidadesForm', () => ({
    __esModule: true,
    default: ({ editMode }: { editMode: boolean }) => <div>Unidade Form {editMode ? 'edit' : 'create'}</div>,
}));

describe('EditarUnidadePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSiglaUnidade = 'JQ';
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) => {
            const routes: Record<string, string> = {
                'institucional.unidades.index': '/institucional/unidades',
                'institucional.unidades.edit': '/institucional/unidades/{id}/edit',
            };
            if (routes[name]) {
                const id = typeof params === 'number' ? params : undefined;
                return id === undefined ? routes[name] : routes[name].replace('{id}', String(id));
            }
            throw new Error(`Route "${name}" not found in mock`);
        });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('breadcrumbs_editar_unidade_usa_route', () => {
        render(<EditarUnidadePage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, editLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/unidades');
        expect(indexLink).toHaveTextContent('Gerenciar Unidades / Campi');

        expect(editLink).toHaveAttribute('href', '/institucional/unidades/2/edit');
        expect(editLink).toHaveTextContent('Editar Unidade');
    });

    it('titulo_head_e_cabecalho_mostram_edicao', () => {
        render(<EditarUnidadePage />);

        expect(document.title).toBe('Editar Unidade');
        expect(screen.getByText('Editar Unidade - Altere os dados da unidade abaixo.')).toBeInTheDocument();
        expect(screen.getByText('Unidade Form edit')).toBeInTheDocument();
        expect(screen.queryByText(/Cadastrar Unidade/)).not.toBeInTheDocument();
    });

    it('normaliza_sigla_nula_para_string_vazia_no_formulario', () => {
        mockSiglaUnidade = null;

        render(<EditarUnidadePage />);

        expect(useForm).toHaveBeenCalledWith({
            nome: 'Campus Jequié',
            sigla: '',
            instituicao_id: '1',
        });
    });
});
