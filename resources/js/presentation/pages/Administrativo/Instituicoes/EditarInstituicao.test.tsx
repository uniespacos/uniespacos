import type { BreadcrumbItem } from '@/types';
import { useForm } from '@inertiajs/react';
import { render, screen } from '@testing-library/react';
import EditarInstituicaoPage from './EditarInstituicao';

const instituicao = {
    id: 1,
    nome: 'Universidade Estadual do Sudoeste da Bahia',
    sigla: 'UESB',
    endereco: 'Estrada do Bem Querer, km 04',
};

let mockEndereco: string | null = instituicao.endereco;

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { instituicao: { ...instituicao, endereco: mockEndereco } } }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    useForm: jest.fn(() => ({
        data: { nome: 'Universidade Estadual do Sudoeste da Bahia', sigla: 'UESB', endereco: 'Estrada do Bem Querer, km 04' },
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

jest.mock('@/presentation/organisms/InstituicaoForm', () => ({
    __esModule: true,
    default: ({ editMode }: { editMode: boolean }) => <div>Instituição Form {editMode ? 'edit' : 'create'}</div>,
}));

describe('EditarInstituicaoPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockEndereco = instituicao.endereco;
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) => {
            const routes: Record<string, string> = {
                'institucional.instituicoes.index': '/institucional/instituicoes',
                'institucional.instituicoes.edit': '/institucional/instituicoes/{id}/edit',
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

    it('breadcrumbs_editar_instituicao_usa_route', () => {
        render(<EditarInstituicaoPage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, editLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/instituicoes');
        expect(indexLink).toHaveTextContent('Gerenciar Instituições');

        expect(editLink).toHaveAttribute('href', '/institucional/instituicoes/1/edit');
        expect(editLink).toHaveTextContent('Editar Instituição');
    });

    it('titulo_head_e_cabecalho_mostram_edicao', () => {
        render(<EditarInstituicaoPage />);

        expect(document.title).toBe('Editar Instituição');
        expect(screen.getByText('Editar Instituição - Altere os dados da instituição abaixo.')).toBeInTheDocument();
        expect(screen.getByText('Instituição Form edit')).toBeInTheDocument();
        expect(screen.queryByText(/Cadastrar Instituição/)).not.toBeInTheDocument();
    });

    it('normaliza_endereco_nulo_para_string_vazia_no_formulario', () => {
        mockEndereco = null;

        render(<EditarInstituicaoPage />);

        expect(useForm).toHaveBeenCalledWith({
            nome: 'Universidade Estadual do Sudoeste da Bahia',
            sigla: 'UESB',
            endereco: '',
        });
    });
});
