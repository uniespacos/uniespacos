import * as UseReservationLiveUpdatesModule from '@/hooks/use-reservation-live-updates';
import * as UseReservaRefreshOnEventModule from '@/hooks/use-reserva-refresh-on-event';
import { ValidationStatus } from '@/contracts';
import { Turno } from '@/contracts/turnos.contract';
import { __resetEchoChannelRegistryForTests } from '@/lib/echo-channel-registry';
import AvaliarReservaPage from './AvaliarReservaPage';
import type { Reserva } from '@/types';
import { render } from '@testing-library/react';
import React from 'react';

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: { reload: jest.fn() },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/presentation/organisms/EvaluationForm', () => ({
    __esModule: true,
    default: () => <div data-testid="evaluation-form">Evaluation Form</div>,
}));

jest.mock('@/presentation/organisms/ConflictAlertBox', () => ({
    __esModule: true,
    ConflictAlertBox: () => <div data-testid="conflict-alert-box">Conflict Alert</div>,
}));

jest.mock('@/presentation/organisms/ConflictCacheSnapshotPanel', () => ({
    __esModule: true,
    ConflictCacheSnapshotPanel: () => <div data-testid="conflict-cache-snapshot-panel">Conflict Cache Snapshot</div>,
}));

jest.mock('@/presentation/organisms/ReservaInfoCard', () => ({
    __esModule: true,
    ReservaInfoCard: ({ children }: { children: React.ReactNode }) => <div data-testid="reserva-info-card">{children}</div>,
}));

jest.mock('@/presentation/molecules/AgendaNavegacao', () => ({
    __esModule: true,
    default: () => <div data-testid="agenda-navegacao">Agenda Navigation</div>,
}));

jest.mock('@/presentation/molecules/CalendarReservationDetails', () => ({
    __esModule: true,
    default: () => <div data-testid="calendar-reservation-details">Calendar Details</div>,
}));

jest.mock('@/hooks/use-reservation-live-updates', () => ({
    useReservationLiveUpdates: jest.fn(),
}));

jest.mock('@/hooks/use-reserva-refresh-on-event', () => ({
    useReservaRefreshOnEvent: jest.fn(),
}));

jest.mock('@/hooks/use-reservation-slots', () => ({
    useReservationSlots: jest.fn(() => ({
        slotsSelecao: [],
        avaliarSlot: jest.fn(),
        handleDecisaoGlobalChange: jest.fn(),
    })),
}));

jest.mock('@/hooks/use-avaliar-reserva', () => ({
    useAvaliarReserva: jest.fn(() => ({
        form: {
            data: {},
            setData: jest.fn(),
            processing: false,
            errors: {},
        },
        submitEvaluation: jest.fn(),
    })),
}));

jest.mock('@/hooks/use-agenda-navigation', () => ({
    useAgendaNavigation: jest.fn(() => ({
        semanaVisivel: new Date(),
        isLoading: false,
        podeVoltar: true,
        podeAvancar: true,
        irParaSemanaAnterior: jest.fn(),
        irParaProximaSemana: jest.fn(),
    })),
}));

jest.mock('@/i18n', () => ({
    useTranslation: jest.fn(() => ({
        t: (key: string) => key,
    })),
}));

describe('AvaliarReservaPage', () => {
    const mockReserva: Reserva = {
        id: 1,
        titulo: 'Teste Reserva',
        descricao: 'Uma reserva de teste',
        situacao: 'em_analise',
        data_inicial: new Date('2024-08-20'),
        data_final: new Date('2024-08-20'),
        recorrencia: 'unica',
        observacao: null,
        created_at: '2024-08-20T10:00:00Z',
        updated_at: '2024-08-20T10:00:00Z',
        horarios: [
            {
                id: 1,
                data: '2024-08-20',
                horario_inicio: '10:00',
                horario_fim: '11:00',
                situacao: 'em_analise',
                agenda: {
                    id: 1,
                    turno: Turno.MANHA,
                    espaco: {
                        id: 1,
                        nome: 'Sala 101',
                        descricao: 'Sala de teste',
                        capacidade_pessoas: 10,
                        imagens: [],
                        main_image_index: null,
                    },
                },
            },
        ],
        validation_status: ValidationStatus.COMPLETED,
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

    it('should render the page without crashing', () => {
        const { getByTestId } = render(
            <AvaliarReservaPage
                reserva={mockReserva}
                semana={mockSemana}
            />
        );

        expect(getByTestId('reserva-info-card')).toBeInTheDocument();
        expect(getByTestId('evaluation-form')).toBeInTheDocument();
    });

    it('should call useReservationLiveUpdates hook', () => {
        render(
            <AvaliarReservaPage
                reserva={mockReserva}
                semana={mockSemana}
            />
        );

        const mockUseReservationLiveUpdates = jest.mocked(UseReservationLiveUpdatesModule.useReservationLiveUpdates);
        expect(mockUseReservationLiveUpdates).toHaveBeenCalled();
    });

    it('should call useReservaRefreshOnEvent with correct only parameter', () => {
        render(
            <AvaliarReservaPage
                reserva={mockReserva}
                semana={mockSemana}
            />
        );

        const mockUseReservaRefreshOnEvent = jest.mocked(UseReservaRefreshOnEventModule.useReservaRefreshOnEvent);
        expect(mockUseReservaRefreshOnEvent).toHaveBeenCalled();
        // Verify the hook was called with options containing 'only' with 'reserva'
        expect(mockUseReservaRefreshOnEvent.mock.calls[0][0].only).toEqual(['reserva']);
    });

    it('should render ConflictAlertBox and ConflictCacheSnapshotPanel', () => {
        const { getByTestId } = render(
            <AvaliarReservaPage
                reserva={mockReserva}
                semana={mockSemana}
                todosOsConflitos={{}}
                conflictCacheSnapshot={null}
            />
        );

        expect(getByTestId('conflict-alert-box')).toBeInTheDocument();
        expect(getByTestId('conflict-cache-snapshot-panel')).toBeInTheDocument();
    });

    it('should display loading state when validation status is PROCESSING', () => {
        const processingReserva: Reserva = {
            ...mockReserva,
            validation_status: ValidationStatus.PROCESSING,
        };

        const { queryByTestId } = render(
            <AvaliarReservaPage
                reserva={processingReserva}
                semana={mockSemana}
            />
        );

        expect(queryByTestId('generic-header')).not.toBeInTheDocument();
    });
});
