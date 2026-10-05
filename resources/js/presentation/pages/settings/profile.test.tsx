import { render, screen } from '@testing-library/react';
import Profile from './profile';
import type { Instituicao } from '@/types';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 1,
                    name: 'Test Gestor',
                    email: 'gestor@test.local',
                    telefone: '71-99999-9999',
                    profile_pic: null,
                    email_verified_at: '2026-01-01T00:00:00Z',
                    roles: ['gestor'],
                    permissions: [],
                    setor_id: null,
                },
            },
        },
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, ...rest }: { children: React.ReactNode; [key: string]: unknown }) => <a {...rest}>{children}</a>,
    useForm: () => ({
        data: {
            name: 'Test Gestor',
            email: 'gestor@test.local',
            phone: '71-99999-9999',
            instituicao_id: '',
            setor_id: '',
            photo: null,
            remove_photo: false,
            _method: 'patch' as const,
        },
        setData: jest.fn(),
        post: jest.fn(),
        errors: {},
        processing: false,
        recentlySuccessful: false,
    }),
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/templates/settings/Layout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/atoms/HeadingSmall', () => ({
    __esModule: true,
    default: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

jest.mock('@/presentation/atoms/UserAvatar', () => ({
    UserAvatar: ({ user }: { user: { name: string; [key: string]: unknown } }) => <div>{user.name}</div>,
}));

jest.mock('@/presentation/atoms/InputError', () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock('@/presentation/molecules/DeleteItem', () => ({
    __esModule: true,
    default: () => <div>Delete Item</div>,
}));

jest.mock('@/presentation/molecules/SeletorInstituicao', () => ({
    SeletorInstituicao: () => <div>Selector Instituicao</div>,
}));

describe('Profile Page', () => {
    const mockInstituicaos: Instituicao[] = [
        {
            id: 1,
            nome: 'UESB',
            sigla: 'UESB',
            endereco: 'Rua Test, 123',
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers({ now: new Date('2026-10-05T12:00:00-03:00') });
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('profile_mostra_gestor_de_reserva_no_badge', () => {
        render(<Profile mustVerifyEmail={false} status={undefined} instituicaos={mockInstituicaos} />);

        const allNameTexts = screen.getAllByText('Test Gestor');
        expect(allNameTexts.length).toBeGreaterThan(0);

        expect(screen.getByText('Gestor de Reserva')).toBeInTheDocument();
    });
});
