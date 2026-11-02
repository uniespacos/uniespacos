import type { BreadcrumbItem } from '@/types';
import { render, screen } from '@testing-library/react';
import CadastrarInstituicaoPage from './CadastrarInstituicao';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: {} }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    useForm: () => ({
        data: { nome: '', sigla: '', endereco: '' },
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

jest.mock('@/presentation/organisms/InstituicaoForm', () => ({
    __esModule: true,
    default: ({ editMode }: { editMode: boolean }) => <div>Instituição Form {editMode ? 'edit' : 'create'}</div>,
}));

describe('CadastrarInstituicaoPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.instituicoes.index': '/institucional/instituicoes',
                'institucional.instituicoes.create': '/institucional/instituicoes/create',
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

    it('breadcrumbs_cadastrar_instituicao_usa_route', () => {
        render(<CadastrarInstituicaoPage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, createLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/instituicoes');
        expect(indexLink).toHaveTextContent('Gerenciar Instituições');

        expect(createLink).toHaveAttribute('href', '/institucional/instituicoes/create');
        expect(createLink).toHaveTextContent('Cadastrar Instituição');
    });

    it('titulo_head_e_cabecalho_mostram_cadastro', () => {
        render(<CadastrarInstituicaoPage />);

        expect(document.title).toBe('Cadastrar Instituição');
        expect(screen.getByText('Cadastrar Instituição - Preencha os dados abaixo para cadastrar uma nova instituição.')).toBeInTheDocument();
        expect(screen.getByText('Instituição Form create')).toBeInTheDocument();
        expect(screen.queryByText(/Editar Instituição/)).not.toBeInTheDocument();
    });
});
