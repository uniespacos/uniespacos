import GerenciarEspacos from './GerenciarEspacos';
import type { Espaco, User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';

const mockGet = jest.fn();
const mockPatch = jest.fn();

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
                },
            ],
            andares: [
                {
                    id: 1,
                    nome: '1',
                    modulo_id: 1,
                    tipo_acesso: [],
                },
            ],
            espacos: {
                data: [
                    {
                        id: 5,
                        nome: 'Auditório Principal',
                        descricao: 'Auditório para palestras',
                        capacidade_pessoas: 150,
                        imagens: [],
                        main_image_index: null,
                        andar_id: 1,
                        andar: {
                            id: 1,
                            nome: '1',
                            modulo_id: 1,
                            tipo_acesso: [],
                            modulo: {
                                id: 1,
                                nome: 'Módulo Central',
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
                            },
                        },
                        agendas: [
                            {
                                id: 1,
                                turno: 'manha',
                                user: { id: 10, name: 'Carlos Gestor' } as User,
                            },
                        ],
                    } as Espaco,
                ],
                links: [
                    { url: null, label: '&laquo; Anterior', active: false },
                    { url: 'https://localhost/institucional/espacos?page=1', label: '1', active: true },
                    { url: null, label: 'Próximo &raquo;', active: false },
                ],
                total: 1,
            },
            users: [
                {
                    id: 10,
                    name: 'Carlos Gestor',
                    email: 'carlos@uesb.br',
                } as User,
            ],
            filters: { search: '', unidade: '1' },
            capacidadeEspacos: [50, 150],
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
        patch: (...args: unknown[]) => {
            mockPatch(...args);
        },
    },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('GerenciarEspacos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza header com título e botão de novo espaço', () => {
        render(<GerenciarEspacos />);

        expect(screen.getByText('Gerenciar Espaços')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Novo Espaço/i })).toBeInTheDocument();
    });

    it('renderiza filtros de busca compartilhados EspacoFiltroBusca', () => {
        render(<GerenciarEspacos />);

        expect(screen.getByPlaceholderText('Buscar por nome do espaço, andar ou módulo...')).toBeInTheDocument();
    });

    it('renderiza DataTable com nome, descrição, localização e capacidade do espaço', () => {
        render(<GerenciarEspacos />);

        expect(screen.getByText('Auditório Principal')).toBeInTheDocument();
        expect(screen.getByText('Auditório para palestras')).toBeInTheDocument();
        expect(screen.getByText('150 pessoas')).toBeInTheDocument();
        expect(screen.getByText('UESB')).toBeInTheDocument();
        expect(screen.getAllByText('Campus Jequié').length).toBeGreaterThan(0);
    });

    it('renderiza botão de ações para o espaço', () => {
        render(<GerenciarEspacos />);

        const actionButton = screen.getByRole('button', { name: 'Ações para o espaço Auditório Principal' });
        expect(actionButton).toBeInTheDocument();
    });

    it('redireciona para tela de cadastro ao clicar no botão Novo Espaço', () => {
        render(<GerenciarEspacos />);

        const novoBtn = screen.getByRole('button', { name: /Novo Espaço/i });
        fireEvent.click(novoBtn);

        expect(mockGet).toHaveBeenCalledWith('https://localhost/institucional/espacos/create');
    });
});
