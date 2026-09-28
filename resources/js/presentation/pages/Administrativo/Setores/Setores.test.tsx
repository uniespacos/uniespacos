import SetoresPage from './Setores';
import type { Setor } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();

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
            setores: {
                data: [
                    {
                        id: 10,
                        nome: 'Departamento de Computação',
                        sigla: 'DCOMP',
                        unidade_id: 1,
                        unidade: {
                            id: 1,
                            nome: 'Campus Jequié',
                            sigla: 'JQ',
                            instituicao: {
                                id: 1,
                                nome: 'UESB',
                                sigla: 'UESB',
                                endereco: 'Estrada do Bem Querer, km 04',
                            },
                        },
                        users_count: 7,
                    } as Setor,
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/setores?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                total: 1,
            },
            filters: { search: 'DCOMP', unidade_id: 1 },
        },
    }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    Link: ({ children, href, ...rest }: { children: React.ReactNode; href?: string; [key: string]: unknown }) => {
        const safeProps = { ...rest };
        delete safeProps.preserveState;
        delete safeProps.preserveScroll;
        delete safeProps.only;
        delete safeProps.as;
        return <a href={href} {...safeProps}>{children}</a>;
    },
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/organisms/ModaisSetor', () => ({
    ModaisSetor: () => <div data-testid="modais-setor">Modais Setor</div>,
}));

describe('SetoresPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de novo setor', () => {
        render(<SetoresPage />);

        expect(screen.getByText('Gerenciar Setores / Departamentos')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Novo Setor/i })).toBeInTheDocument();
    });

    it('renderiza SearchFilter com input de busca e select de unidade', () => {
        render(<SetoresPage />);

        expect(screen.getByPlaceholderText('Nome ou sigla do setor...')).toBeInTheDocument();
        expect(screen.getAllByText('Unidade').length).toBeGreaterThan(0);
    });

    it('renderiza DataTable com dados de setores e contagem de usuários', () => {
        render(<SetoresPage />);

        expect(screen.getByText('Departamento de Computação')).toBeInTheDocument();
        expect(screen.getByText('Sigla: DCOMP')).toBeInTheDocument();
        expect(screen.getAllByText('Campus Jequié').length).toBeGreaterThan(0);
        expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('renderiza botões de ação para editar e excluir', () => {
        render(<SetoresPage />);

        expect(screen.getByRole('button', { name: 'Editar setor' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Excluir setor' })).toBeInTheDocument();
    });

    it('dispara limpeza de filtros ao clicar em Limpar Filtros', () => {
        render(<SetoresPage />);

        const clearBtn = screen.getByRole('button', { name: 'Limpar Filtros' });
        expect(clearBtn).toBeInTheDocument();

        fireEvent.click(clearBtn);

        expect(mockGet).toHaveBeenCalledWith(
            'https://localhost/institucional/setors/index',
            {},
            expect.objectContaining({ preserveState: true, preserveScroll: true }),
        );
    });
});
