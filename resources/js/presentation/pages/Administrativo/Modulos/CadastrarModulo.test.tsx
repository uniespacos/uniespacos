import CadastrarModuloPage from './CadastrarModulo';
import { render, screen } from '@testing-library/react';
import type { BreadcrumbItem } from '@/types';

const mockPost = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            instituicao: {
                id: 1,
                nome: 'Universidade Estadual do Sudoeste da Bahia',
                sigla: 'UESB',
                endereco: 'Estrada do Bem Querer, km 04',
            },
            unidades: [
                {
                    id: 1,
                    nome: 'Campus Jequié',
                    sigla: 'JQ',
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
        data: { nome: '', unidade_id: '', andares: [] },
        setData: jest.fn(),
        post: (...args: unknown[]) => {
            mockPost(...args);
        },
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

jest.mock('@/presentation/organisms/ModuloForm', () => ({
    __esModule: true,
    default: () => <div>Módulo Form</div>,
}));

describe('CadastrarModuloPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.modulos.index': '/institucional/modulos',
                'institucional.modulos.create': '/institucional/modulos/create',
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

    it('breadcrumbs_cadastrar_modulo_usa_route', () => {
        render(<CadastrarModuloPage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, createLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/modulos');
        expect(indexLink).toHaveTextContent('Módulos');

        expect(createLink).toHaveAttribute('href', '/institucional/modulos/create');
        expect(createLink).toHaveTextContent('Cadastrar Módulo');
    });
});
