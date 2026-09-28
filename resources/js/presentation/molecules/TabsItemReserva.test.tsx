import type { Horario, Reserva } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import TabsItemReserva from './TabsItemReserva';

// Mock the route() global helper
const mockRoute = jest.fn((name: string, params?: Record<string, number>) => ({
    name,
    params: params ?? {},
}));

Object.defineProperty(globalThis, 'route', {
    value: mockRoute,
    writable: true,
    configurable: true,
});

// Holder de mocks: a fabrica do jest.mock e icada acima das declaracoes, entao
// ela nao pode dereferenciar `mocks` na criacao — so dentro da arrow, que roda
// no momento da chamada. Assertar sobre `mocks.routerGet` (funcao de objeto
// literal) tambem evita o unbound-method que `router.get` dispararia.
const mocks = { routerGet: jest.fn() };

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mocks.routerGet(...args);
        },
    },
}));

jest.mock('@/i18n', () => ({
    useTranslation: () => {
        const translations: Record<string, string> = {
            'dashboard.reservas_recentes.titulo': 'Reservas Recentes',
            'dashboard.reservas_recentes.descricao': 'Suas reservas mais recentes',
            'reservas.acoes.ver_detalhes': 'Ver Detalhes',
            'reservas.situacao.deferida': 'Deferida',
            'reservas.situacao.em_analise': 'Em análise',
            'common.status.unknown': 'Desconhecido',
        };

        return {
            t: (key: string) => translations[key] || key,
            formatDate: (date: Date) => date.toLocaleDateString('pt-BR'),
        };
    },
}));

jest.mock('@/lib/auth-can', () => ({
    useCan: jest.fn(() => false),
}));

const mockReserva1: Reserva = {
    id: 1,
    titulo: 'Seminário de IA',
    descricao: 'Apresentação de trabalhos',
    situacao: 'deferida',
    data_inicial: new Date('2026-09-01T09:00:00Z'),
    data_final: new Date('2026-09-01T12:00:00Z'),
    recorrencia: 'unica',
    observacao: null,
    created_at: '',
    updated_at: '',
    can_update: true,
    horarios: [
        {
            id: 1,
            data: '2026-09-01',
            horario_inicio: '09:00:00',
            horario_fim: '12:00:00',
            situacao: 'deferida',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            agenda: {
                id: 1,
                turno: 'manha',
                espaco: {
                    id: 5,
                    nome: 'Laboratório 3',
                    capacidade_pessoas: 30,
                    descricao: '',
                    imagens: [],
                    main_image_index: null,
                    andar: {
                        id: 1,
                        nome: 'andar-2',
                        modulo_id: 1,
                        created_at: '',
                        updated_at: '',
                        modulo: {
                            id: 1,
                            nome: 'Módulo Central',
                            unidade_id: 1,
                            created_at: '',
                            updated_at: '',
                        },
                    },
                },
            },
        } as unknown as Horario,
    ],
};

const mockReserva2: Reserva = {
    id: 2,
    titulo: 'Workshop de React',
    descricao: 'Introdução ao React 19',
    situacao: 'em_analise',
    data_inicial: new Date('2026-09-02T14:00:00Z'),
    data_final: new Date('2026-09-02T16:00:00Z'),
    recorrencia: 'unica',
    observacao: null,
    created_at: '',
    updated_at: '',
    can_update: true,
    horarios: [
        {
            id: 2,
            data: '2026-09-02',
            horario_inicio: '14:00:00',
            horario_fim: '16:00:00',
            situacao: 'em_analise',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            agenda: {
                id: 2,
                turno: 'tarde',
                espaco: {
                    id: 6,
                    nome: 'Sala de Aula 1',
                    capacidade_pessoas: 50,
                    descricao: '',
                    imagens: [],
                    main_image_index: null,
                    andar: {
                        id: 2,
                        nome: 'terreo',
                        modulo_id: 1,
                        created_at: '',
                        updated_at: '',
                        modulo: {
                            id: 1,
                            nome: 'Módulo Central',
                            unidade_id: 1,
                            created_at: '',
                            updated_at: '',
                        },
                    },
                },
            },
        } as unknown as Horario,
    ],
};

describe('TabsItemReserva', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renderiza título e descrição do cabeçalho', () => {
        render(<TabsItemReserva reservas={[mockReserva1]} />);

        expect(screen.getByText('Reservas Recentes')).toBeInTheDocument();
        expect(screen.getByText('Suas reservas mais recentes')).toBeInTheDocument();
    });

    it('renderiza título e SituacaoBadge de cada reserva', () => {
        render(<TabsItemReserva reservas={[mockReserva1, mockReserva2]} />);

        expect(screen.getByText('Seminário de IA')).toBeInTheDocument();
        expect(screen.getByText('Workshop de React')).toBeInTheDocument();
        expect(screen.getByText('Deferida')).toBeInTheDocument();
        expect(screen.getByText('Em análise')).toBeInTheDocument();
    });

    it('navega para a reserva ao clicar em Ver Detalhes', () => {
        render(<TabsItemReserva reservas={[mockReserva1]} />);

        const detalhesButton = screen.getByRole('button', { name: /Ver Detalhes/i });
        fireEvent.click(detalhesButton);

        expect(mockRoute).toHaveBeenCalledWith('reservas.index', { reserva: 1 });
        expect(mocks.routerGet).toHaveBeenCalledWith({ name: 'reservas.index', params: { reserva: 1 } });
    });

    it('renderiza múltiplas reservas com seus respectivos botões Ver Detalhes', () => {
        render(<TabsItemReserva reservas={[mockReserva1, mockReserva2]} />);

        const detalhesButtons = screen.getAllByRole('button', { name: /Ver Detalhes/i });
        expect(detalhesButtons).toHaveLength(2);

        fireEvent.click(detalhesButtons[0]);
        expect(mockRoute).toHaveBeenCalledWith('reservas.index', { reserva: 1 });
        expect(mocks.routerGet).toHaveBeenCalledWith({ name: 'reservas.index', params: { reserva: 1 } });

        fireEvent.click(detalhesButtons[1]);
        expect(mockRoute).toHaveBeenCalledWith('reservas.index', { reserva: 2 });
        expect(mocks.routerGet).toHaveBeenCalledWith({ name: 'reservas.index', params: { reserva: 2 } });
    });
});
