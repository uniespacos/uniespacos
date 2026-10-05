import EditarModuloPage from './EditarModulo';
import { render, screen } from '@testing-library/react';
import type { BreadcrumbItem } from '@/types';

const mockPatch = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            modulo: {
                id: 1,
                nome: 'Módulo Central',
                unidade_id: 1,
                andares: [],
            },
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
        data: { nome: 'Módulo Central', unidade_id: '1', andares: [] },
        setData: jest.fn(),
        patch: (...args: unknown[]) => {
            mockPatch(...args);
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

describe('EditarModuloPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string, params?: unknown) => {
            const routes: Record<string, string> = {
                'institucional.modulos.index': '/institucional/modulos',
                'institucional.modulos.edit': '/institucional/modulos/{id}/edit',
            };
            if (routes[name]) {
                let route = routes[name];
                if (params && typeof params === 'number') {
                    route = route.replace('{id}', String(params));
                } else if (params && typeof params === 'object' && 'id' in params) {
                    route = route.replace('{id}', String((params as Record<string, unknown>).id));
                }
                return route;
            }
            throw new Error(`Route "${name}" not found in mock`);
        });
        jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00-03:00') });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        jest.useRealTimers();
    });

    it('breadcrumbs_editar_modulo_usa_route', () => {
        render(<EditarModuloPage />);

        const breadcrumbs = screen.getAllByTestId('bc');
        expect(breadcrumbs).toHaveLength(2);

        const [indexLink, editLink] = breadcrumbs;
        expect(indexLink).toHaveAttribute('href', '/institucional/modulos');
        expect(indexLink).toHaveTextContent('Módulos');

        expect(editLink).toHaveAttribute('href', '/institucional/modulos/1/edit');
        expect(editLink).toHaveTextContent('Editar Módulo');
    });
});
