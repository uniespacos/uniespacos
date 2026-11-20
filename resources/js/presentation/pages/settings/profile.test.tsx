import type { Instituicao } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import Profile from './profile';

const mockSetData = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            auth: {
                user: {
                    id: 1,
                    name: 'Test Gestor',
                    email: 'gestor@test.local',
                    telefone: '71-99999-9999',
                    profile_pic: 'avatars/foto-atual.jpg',
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
        setData: mockSetData,
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
    UserAvatar: ({ user }: { user: { name: string; profile_pic?: string | null; [key: string]: unknown } }) => (
        <div data-testid="user-avatar" data-profile-pic={user.profile_pic ?? ''}>
            {user.name}
        </div>
    ),
}));

jest.mock('@/presentation/atoms/InputError', () => ({
    __esModule: true,
    default: ({ message }: { message?: string }) => (message ? <p role="alert">{message}</p> : null),
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
        URL.createObjectURL = jest.fn(() => 'blob:http://localhost/nova-foto');
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

    it('rejeita arquivo que nao e imagem, exibe mensagem traduzida, mantem foto anterior e limpa o input', () => {
        render(<Profile mustVerifyEmail={false} status={undefined} instituicaos={mockInstituicaos} />);

        const inputs = screen.getAllByLabelText('Alterar foto de perfil');
        const fileInput = inputs.find((el) => el.tagName === 'INPUT') as HTMLInputElement;

        const invalidFile = new File(['conteudo texto'], 'documento.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });

        expect(screen.getByRole('alert')).toHaveTextContent('Selecione um arquivo de imagem válido (JPG, PNG, GIF ou WebP).');
        expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-profile-pic', 'avatars/foto-atual.jpg');
        expect(mockSetData).not.toHaveBeenCalled();
        expect(fileInput.value).toBe('');
    });

    it('rejeita imagem acima de 2 MB, exibe mensagem de tamanho maximo e mantem foto anterior', () => {
        render(<Profile mustVerifyEmail={false} status={undefined} instituicaos={mockInstituicaos} />);

        const inputs = screen.getAllByLabelText('Alterar foto de perfil');
        const fileInput = inputs.find((el) => el.tagName === 'INPUT') as HTMLInputElement;

        const oversizedFile = new File(['x'], 'grande.png', { type: 'image/png' });
        Object.defineProperty(oversizedFile, 'size', { value: 3 * 1024 * 1024 });

        fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

        expect(screen.getByRole('alert')).toHaveTextContent('A imagem deve ter no máximo 2 MB.');
        expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-profile-pic', 'avatars/foto-atual.jpg');
        expect(mockSetData).not.toHaveBeenCalled();
        expect(fileInput.value).toBe('');
    });

    it('aceita imagem valida, limpa erro anterior e atualiza o preview', () => {
        render(<Profile mustVerifyEmail={false} status={undefined} instituicaos={mockInstituicaos} />);

        const inputs = screen.getAllByLabelText('Alterar foto de perfil');
        const fileInput = inputs.find((el) => el.tagName === 'INPUT') as HTMLInputElement;

        const invalidFile = new File(['conteudo'], 'doc.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [invalidFile] } });
        expect(screen.getByRole('alert')).toBeInTheDocument();

        const validFile = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' });
        fireEvent.change(fileInput, { target: { files: [validFile] } });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-profile-pic', 'blob:http://localhost/nova-foto');
        expect(mockSetData).toHaveBeenCalledTimes(1);
    });
});
