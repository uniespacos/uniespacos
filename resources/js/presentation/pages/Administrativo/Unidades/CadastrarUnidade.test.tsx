import type { BreadcrumbItem } from '@/types';
import { render, screen } from '@testing-library/react';
import CadastrarUnidadePage from './CadastrarUnidade';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            instituicao: {
                id: 1,
                nome: 'Universidade Estadual do Sudoeste da Bahia',
                sigla: 'UESB',
                endereco: 'Estrada do Bem Querer, km 04',
            },
        },
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    useForm: () => ({
        data: { nome: '', sigla: '', instituicao_id: '1' },
        setData: jest.fn(),
        post: jest.fn(),
        processing: false,
        errors: {},
    }),
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

describe('CadastrarUnidadePage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.unidades.index': '/institucional/unidades',
                'institucional.unidades.create': '/institucional/unidades/create',
            };
            if (routes[name]) {
                return routes[name];
            }
            throw new Error(`Route "${name}" not found in mock`);
        });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('breadcrumbs_cadastrar_unidade_usa_route', () => {
        render(<CadastrarUnidadePage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, createLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/unidades');
        expect(indexLink).toHaveTextContent('Gerenciar Unidades / Campi');

        expect(createLink).toHaveAttribute('href', '/institucional/unidades/create');
        expect(createLink).toHaveTextContent('Cadastrar Unidade');
    });

    it('titulo_head_e_cabecalho_mostram_cadastro', () => {
        render(<CadastrarUnidadePage />);

        expect(document.title).toBe('Cadastrar Unidade');
        expect(screen.getByText('Cadastrar Unidade - Preencha os dados abaixo para cadastrar uma nova unidade.')).toBeInTheDocument();
        expect(screen.getByText('Unidade Form create')).toBeInTheDocument();
        expect(screen.queryByText(/Editar Unidade/)).not.toBeInTheDocument();
    });
});
