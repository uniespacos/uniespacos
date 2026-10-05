import CadastrarEspacoPage from './CadastrarEspaco';
import { render, screen } from '@testing-library/react';
import type { BreadcrumbItem } from '@/types';

const mockPost = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
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
        },
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
        jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00-03:00') });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        jest.useRealTimers();
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
});
