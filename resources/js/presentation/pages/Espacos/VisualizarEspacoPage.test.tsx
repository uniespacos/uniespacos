import * as UseEspacoLiveUpdatesModule from '@/hooks/use-espaco-live-updates';
import * as UseReservationLiveUpdatesModule from '@/hooks/use-reservation-live-updates';
import { __resetEchoChannelRegistryForTests } from '@/lib/echo-channel-registry';
import VisualizarEspaço from '@/presentation/pages/Espacos/VisualizarEspacoPage';
import type { Espaco, Reserva } from '@/types';
import * as InertiaReact from '@inertiajs/react';
import { render } from '@testing-library/react';
import React from 'react';

jest.mock('@inertiajs/react');

jest.mock('@/presentation/templates/AppLayout', () => {
    return function DummyLayout({ children }: { children: React.ReactNode }) {
        return <div>{children}</div>;
    };
});

jest.mock('@/presentation/organisms/EspacoAgenda', () => {
    return function DummyAgenda() {
        return <div data-testid="agenda-espaco">Agenda Component</div>;
    };
});

jest.mock('@/hooks/use-reservation-live-updates', () => ({
    useReservationLiveUpdates: jest.fn(),
}));

jest.mock('@/hooks/use-espaco-live-updates', () => ({
    useEspacoLiveUpdates: jest.fn(),
}));

describe('VisualizarEspacoPage', () => {
    const mockEspaco: Espaco = {
        id: 1,
        nome: 'Sala de Reuniões',
        descricao: 'Uma sala de reuniões',
        capacidade_pessoas: 10,
        imagens: [],
        main_image_index: null,
    };

    const mockSemana = {
        inicio: '2024-08-19',
        fim: '2024-08-25',
        referencia: '2024-08-22',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        __resetEchoChannelRegistryForTests();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render the page with espaco and semana props', () => {
        const { getByTestId } = render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        expect(getByTestId('agenda-espaco')).toBeInTheDocument();
    });

    it('should call useReservationLiveUpdates hook', () => {
        render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        const mockUseReservationLiveUpdates = jest.mocked(UseReservationLiveUpdatesModule.useReservationLiveUpdates);
        expect(mockUseReservationLiveUpdates).toHaveBeenCalled();
    });

    it('should call useEspacoLiveUpdates hook with espaco.id', () => {
        render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        const mockUseEspacoLiveUpdates = jest.mocked(UseEspacoLiveUpdatesModule.useEspacoLiveUpdates);
        expect(mockUseEspacoLiveUpdates).toHaveBeenCalledWith(1);
    });

    it('should call useEspacoLiveUpdates with updated espaco.id when espaco changes', () => {
        const { rerender } = render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        const mockUseEspacoLiveUpdates = jest.mocked(UseEspacoLiveUpdatesModule.useEspacoLiveUpdates);
        expect(mockUseEspacoLiveUpdates).toHaveBeenCalledWith(1);

        const updatedEspaco: Espaco = { ...mockEspaco, id: 2 };
        rerender(<VisualizarEspaço espaco={updatedEspaco} semana={mockSemana} />);

        expect(mockUseEspacoLiveUpdates).toHaveBeenCalledWith(2);
    });

    it('should reload page when reserva:updated event is dispatched', () => {
        jest.useFakeTimers();

        render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        const event = new CustomEvent('reserva:updated', {
            detail: { reservaId: 123, action: 'created', espacoId: 1 },
        });
        document.dispatchEvent(event);

        jest.advanceTimersByTime(400);

        const { router } = jest.mocked(InertiaReact);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(router.reload).toHaveBeenCalledWith({ only: ['espaco'] });

        jest.useRealTimers();
    });

    it('should debounce multiple reserva:updated events', () => {
        jest.useFakeTimers();

        render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} />);

        const event = new CustomEvent('reserva:updated', {
            detail: { reservaId: 123, action: 'created', espacoId: 1 },
        });

        document.dispatchEvent(event);
        document.dispatchEvent(event);
        document.dispatchEvent(event);

        jest.advanceTimersByTime(400);

        const { router } = jest.mocked(InertiaReact);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(router.reload).toHaveBeenCalledTimes(1);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(router.reload).toHaveBeenCalledWith({ only: ['espaco'] });

        jest.useRealTimers();
    });

    it('should render with isEditMode and reserva props', () => {
        const mockReserva: Reserva = {
            id: 1,
            titulo: 'Reunião de Planejamento',
            descricao: 'Reunião com o time',
            situacao: 'deferida',
            data_inicial: new Date('2024-08-20'),
            data_final: new Date('2024-08-20'),
            recorrencia: 'unica',
            observacao: null,
            created_at: '2024-08-20T10:00:00Z',
            updated_at: '2024-08-20T10:00:00Z',
            horarios: [],
        };

        const { getByTestId } = render(<VisualizarEspaço espaco={mockEspaco} semana={mockSemana} reserva={mockReserva} isEditMode={true} />);

        expect(getByTestId('agenda-espaco')).toBeInTheDocument();
    });
});
