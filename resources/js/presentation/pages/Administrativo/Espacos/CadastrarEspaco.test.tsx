import type { BreadcrumbItem } from '@/types';
import { render, screen } from '@testing-library/react';
import CadastrarEspacoPage from './CadastrarEspaco';

const mockPost = jest.fn();

const mockPageProps: Record<string, unknown> = {
    unidades: [
        {
            id: 1,
            nome: 'Campus Jequié',
            sigla: 'JQ',
        },
    ],
    modulos: [
        {
            id: 1,
            nome: 'Módulo Central',
            unidade_id: 1,
            andares: [],
        },
    ],
    andares: [
        {
            id: 1,
            numero: 1,
            modulo_id: 1,
            tipos_acesso: [],
        },
    ],
};

const espacoExistente = {
    id: 9,
    nome: 'Laboratório de Informática',
    capacidade_pessoas: 30,
    descricao: 'Laboratório com 30 computadores',
    imagens: [],
    main_image_index: undefined,
    andar: {
        id: 1,
        modulo: {
            id: 1,
            unidade: { id: 1 },
        },
    },
};

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: mockPageProps,
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href, ...rest }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => {
        const safeProps = { ...rest };
        delete safeProps.preserveState;
        delete safeProps.preserveScroll;
        delete safeProps.only;
        delete safeProps.as;
        return (
            <a href={href} {...safeProps}>
                {children}
            </a>
        );
    },
    router: {
        get: jest.fn(),
    },
    useForm: () => ({
        data: {
            nome: '',
            capacidade_pessoas: undefined,
            descricao: '',
            imagens: [],
            main_image_index: undefined,
            unidade_id: undefined,
            modulo_id: undefined,
            andar_id: undefined,
        },
        setData: jest.fn(),
        post: (...args: unknown[]) => {
            mockPost(...args);
        },
        patch: jest.fn(),
        processing: false,
        errors: {},
        reset: jest.fn(),
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

jest.mock('@/presentation/molecules/LocationSelector', () => ({
    LocationSelector: () => <div>Location Selector</div>,
}));

jest.mock('@/presentation/organisms/EspacoFormFields', () => ({
    EspacoFormFields: () => <div>Espaço Form Fields</div>,
}));

jest.mock('@/presentation/molecules/ImageUpload', () => ({
    ImageUpload: () => <div>Image Upload</div>,
}));

describe('CadastrarEspacoPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete mockPageProps.espaco;
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.espacos.index': '/institucional/espacos',
                'institucional.espacos.create': '/institucional/espacos/create',
            };
            if (routes[name]) {
                return routes[name];
            }
            throw new Error(`Route "${name}" not found in mock`);
        });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        delete mockPageProps.espaco;
    });

    it('breadcrumbs_cadastrar_espaco_usa_route', () => {
        render(<CadastrarEspacoPage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, createLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/espacos');
        expect(indexLink).toHaveTextContent('Espaços');

        expect(createLink).toHaveAttribute('href', '/institucional/espacos/create');
        expect(createLink).toHaveTextContent('Cadastrar Espaço');
    });

    it('titulo_head_e_cabecalho_mostram_cadastro', () => {
        render(<CadastrarEspacoPage />);

        expect(document.title).toBe('Cadastrar Espaço');
        expect(screen.getByText('Cadastrar Espaço - Preencha os dados para cadastrar um novo espaço.')).toBeInTheDocument();
        expect(screen.queryByText(/Editar Espaço/)).not.toBeInTheDocument();
    });

    it('mostra os botões Cancelar e Salvar no cadastro', () => {
        render(<CadastrarEspacoPage />);

        expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
        expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'submit');
        expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
    });

    it('titulo_head_e_cabecalho_mostram_edicao_com_botao_atualizar', () => {
        mockPageProps.espaco = espacoExistente;
        render(<CadastrarEspacoPage />);

        expect(document.title).toBe('Editar Espaço');
        expect(screen.getByText('Editar Espaço - Atualize os dados do espaço.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Atualizar' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    });
});
