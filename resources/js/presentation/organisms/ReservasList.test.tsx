import { render, screen } from '@testing-library/react';
import { act } from 'react';
import React from 'react';
import type { ReactNode } from 'react';
import type { Reserva, Paginator } from '@/types';
import { SituacaoReserva, RecorrenciaReserva, ValidationStatus } from '@/contracts';

const mockRouterGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: mockRouterGet,
    },
}));

import { ReservasList } from './ReservasList';

jest.mock('@/i18n', () => ({
    useTranslation: () => ({
        t: (key: string): string => key,
        formatDate: (date: Date | string): string => {
            const d = typeof date === 'string' ? new Date(date) : date;
            return d.toLocaleDateString('pt-BR');
        },
    }),
}));

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: (): boolean => false,
}));

jest.mock('@/presentation/organisms/ReservasDetalhes', () => ({
    __esModule: true,
    default: ({ isOpen }: { isOpen: boolean }): ReactNode => (
        React.createElement('div', { 'data-testid': 'reserva-detalhes', style: { display: isOpen ? 'block' : 'none' } })
    ),
}));

jest.mock('@/presentation/molecules/DataTable', () => ({
    DataTable: ({ data, actions }: { data: Reserva[]; actions?: (item: Reserva) => React.ReactNode }): ReactNode => (
        React.createElement('div', { 'data-testid': 'data-table' },
            data.map((item) => (
                React.createElement('div', { key: item.id, 'data-testid': `reserva-row-${String(item.id)}` },
                    actions?.(item)
                )
            ))
        )
    ),
}));

jest.mock('@/presentation/molecules/DeleteItem', () => ({
    __esModule: true,
    default: (): ReactNode => React.createElement('div', { 'data-testid': 'delete-item' }),
}));

interface RouterGetPayload {
    reserva?: number;
    semana?: string;
}

interface RouterGetOptions {
    preserveState?: boolean;
    preserveScroll?: boolean;
    only?: string[];
}

const setupMockRoute = (): void => {
    (globalThis as typeof globalThis & { route: (name: string) => string }).route = (name: string): string => `route://${name}`;
};

const cleanupMockRoute = (): void => {
    (globalThis as typeof globalThis & { route: (name: string) => string }).route = (): string => {
        throw new Error('route mock not set up');
    };
};

const createMockReserva = (overrides?: Partial<Reserva>): Reserva => ({
    id: 1,
    titulo: 'Reunião',
    descricao: 'Teste',
    situacao: SituacaoReserva.DEFERIDA,
    data_inicial: new Date('2026-08-01'),
    data_final: new Date('2026-08-05'),
    recorrencia: RecorrenciaReserva.UNICA,
    observacao: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    can_update: true,
    horarios: [
        {
            id: 1,
            data: '2026-09-15',
            horario_inicio: '08:00',
            horario_fim: '10:00',
            situacao: SituacaoReserva.DEFERIDA,
            validation_status: ValidationStatus.PENDING,
            conflict_cache: null,
            cache_validated_at: null,
        },
    ],
    ...overrides,
});

const createMockPaginator = (reservas: Reserva[]): Paginator<Reserva> => {
    const count = reservas.length;
    return {
        data: reservas,
        links: [],
        current_page: 1,
        last_page: 1,
        from: 1,
        to: count,
        total: count,
        per_page: 15,
        path: 'reservas',
        first_page_url: '',
        last_page_url: '',
        next_page_url: null,
        prev_page_url: null,
    };
};

describe('ReservasList - handleAbrirDetalhes', (): void => {
    beforeEach((): void => {
        mockRouterGet.mockClear();
        setupMockRoute();
    });

    afterEach((): void => {
        cleanupMockRoute();
    });

    it('should call router.get with semana parameter derived from first horario data', (): void => {
        const reserva = createMockReserva({
            horarios: [
                {
                    id: 1,
                    data: '2026-09-15',
                    horario_inicio: '08:00',
                    horario_fim: '10:00',
                    situacao: SituacaoReserva.DEFERIDA,
                    validation_status: ValidationStatus.PENDING,
                    conflict_cache: null,
                    cache_validated_at: null,
                },
            ],
        });

        const paginator = createMockPaginator([reserva]);

        render(
            <ReservasList
                paginator={paginator}
                fallback={<div>Nenhuma reserva</div>}
                isGestor={false}
                routeName="reservas.index"
            />,
        );

        const detalhesButton = screen.getByText('reservas.acoes.ver_detalhes');
        act((): void => {
            detalhesButton.click();
        });

        expect(mockRouterGet).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                reserva: reserva.id,
                semana: '2026-09-15',
            }),
            expect.any(Object),
        );
    });

    it('should include correct options when opening details', (): void => {
        const reserva = createMockReserva({
            horarios: [
                {
                    id: 1,
                    data: '2026-08-25',
                    horario_inicio: '14:00',
                    horario_fim: '16:00',
                    situacao: SituacaoReserva.DEFERIDA,
                    validation_status: ValidationStatus.PENDING,
                    conflict_cache: null,
                    cache_validated_at: null,
                },
            ],
        });

        const paginator = createMockPaginator([reserva]);

        render(
            <ReservasList
                paginator={paginator}
                fallback={<div>Nenhuma reserva</div>}
                isGestor={false}
                routeName="reservas.index"
            />,
        );

        const detalhesButton = screen.getByText('reservas.acoes.ver_detalhes');
        act((): void => {
            detalhesButton.click();
        });

        expect(mockRouterGet).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.objectContaining({
                only: ['reservaToShow', 'semana'],
            }),
        );
    });

    it('should fallback to data_inicial when horarios is empty', (): void => {
        const dataInicial = new Date('2026-08-01');
        const reserva = createMockReserva({
            data_inicial: dataInicial,
            horarios: [],
        });

        const paginator = createMockPaginator([reserva]);

        render(
            <ReservasList
                paginator={paginator}
                fallback={<div>Nenhuma reserva</div>}
                isGestor={false}
                routeName="reservas.index"
            />,
        );

        const detalhesButton = screen.getByText('reservas.acoes.ver_detalhes');
        act((): void => {
            detalhesButton.click();
        });

        const calls = mockRouterGet.mock.calls as [string, RouterGetPayload, RouterGetOptions][];
        const params = calls[0][1];
        expect(params.reserva).toBe(reserva.id);
        expect(typeof params.semana).toBe('string');
    });
});
