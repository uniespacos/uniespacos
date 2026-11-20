import { EscopoRecorrencia, SituacaoHorario, SituacaoReserva, ValidationStatus, type SituacaoReservaType } from '@/contracts';
import { Turno } from '@/contracts/turnos.contract';
import * as UseAgendaNavigationModule from '@/hooks/use-agenda-navigation';
import * as UseAvaliarReservaModule from '@/hooks/use-avaliar-reserva';
import * as UseReservaRefreshOnEventModule from '@/hooks/use-reserva-refresh-on-event';
import * as UseReservationLiveUpdatesModule from '@/hooks/use-reservation-live-updates';
import * as UseReservationSlotsModule from '@/hooks/use-reservation-slots';
import * as UseI18nModule from '@/i18n';
import type { TranslationKey } from '@/i18n/schema';
import type { SupportedLocale, TranslationParams } from '@/i18n/types';
import { __resetEchoChannelRegistryForTests } from '@/lib/echo-channel-registry';
import type { Reserva, SlotCalendario } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import AvaliarReservaPage from './AvaliarReservaPage';

jest.mock('@inertiajs/react', () => ({
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: { get: jest.fn(), reload: jest.fn() },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let capturedEvaluationFormProps: {
    onDecisaoChange?: (value: SituacaoReservaType) => void;
    slotsSelecao?: SlotCalendario[];
} = {};

jest.mock('@/presentation/organisms/EvaluationForm', () => ({
    __esModule: true,
    default: (props: { onDecisaoChange?: (value: SituacaoReservaType) => void; slotsSelecao?: SlotCalendario[] }) => {
        capturedEvaluationFormProps = props;
        return (
            <div data-testid="evaluation-form">
                <button
                    type="button"
                    data-testid="mock-deferir-btn"
                    onClick={() => {
                        props.onDecisaoChange?.(SituacaoReserva.DEFERIDA);
                    }}
                >
                    Deferir
                </button>
            </div>
        );
    },
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
        initialSlots: [],
        slotsSelecao: [],
        avaliarSlot: jest.fn(),
        handleDecisaoGlobalChange: jest.fn(),
        restaurarSlotsForaDoEscopo: jest.fn(),
    })),
}));

jest.mock('@/hooks/use-avaliar-reserva', () => ({
    useAvaliarReserva: jest.fn(() => ({
        form: {
            data: {
                evaluation_scope: 'recurring',
                motivo: '',
                observacao: '',
                situacao: 'em_analise',
                horarios_avaliados: [],
            },
            setData: jest.fn(),
            processing: false,
            errors: {},
        },
        submitEvaluation: jest.fn(),
    })),
}));

jest.mock('@/hooks/use-agenda-navigation', () => ({
    useAgendaNavigation: jest.fn(() => ({
        // Data fixa (semana da reserva de teste): `new Date()` faria o resultado depender do dia da execução.
        semanaVisivel: new Date(2024, 7, 19),
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

    const actualI18n = jest.requireActual<typeof import('@/i18n')>('@/i18n');

    const mockUseTranslationWithLocale = (locale: SupportedLocale) => {
        jest.mocked(UseI18nModule.useTranslation).mockReturnValue({
            t: (key: TranslationKey, params?: TranslationParams) => actualI18n.translate(key, params, locale),
            locale,
            formatDate: (date, pattern) => actualI18n.formatDate(date, pattern, locale),
            formatDateTime: (date) => actualI18n.formatDateTime(date, locale),
            formatNumber: (value, options) => actualI18n.formatNumber(value, locale, options),
        });
    };

    beforeEach(() => {
        jest.clearAllMocks();
        capturedEvaluationFormProps = {};
        __resetEchoChannelRegistryForTests();
        jest.mocked(UseI18nModule.useTranslation).mockReturnValue({
            t: (key: string) => key,
            locale: 'pt-BR',
            formatDate: (date, pattern) => actualI18n.formatDate(date, pattern, 'pt-BR'),
            formatDateTime: (date) => actualI18n.formatDateTime(date, 'pt-BR'),
            formatNumber: (value, options) => actualI18n.formatNumber(value, 'pt-BR', options),
        });
        jest.mocked(UseAgendaNavigationModule.useAgendaNavigation).mockReturnValue({
            semanaVisivel: new Date(2024, 7, 19),
            isLoading: false,
            podeVoltar: true,
            podeAvancar: true,
            irParaSemanaAnterior: jest.fn(),
            irParaProximaSemana: jest.fn(),
            irParaSemanaAtual: jest.fn(),
        });
        jest.mocked(UseReservationSlotsModule.useReservationSlots).mockReturnValue({
            initialSlots: [],
            slotsSelecao: [],
            avaliarSlot: jest.fn(),
            handleDecisaoGlobalChange: jest.fn(),
            restaurarSlotsForaDoEscopo: jest.fn(),
        });
        jest.mocked(UseAvaliarReservaModule.useAvaliarReserva).mockReturnValue({
            form: {
                data: {
                    evaluation_scope: EscopoRecorrencia.RECURRING,
                    motivo: '',
                    observacao: '',
                    situacao: SituacaoReserva.EM_ANALISE,
                    horarios_avaliados: [],
                },
                setData: jest.fn(),
                processing: false,
                errors: {},
            } as unknown as ReturnType<typeof UseAvaliarReservaModule.useAvaliarReserva>['form'],
            submitEvaluation: jest.fn(),
        });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should render the page without crashing', () => {
        const { getByTestId } = render(<AvaliarReservaPage reserva={mockReserva} semana={mockSemana} />);

        expect(getByTestId('reserva-info-card')).toBeInTheDocument();
        expect(getByTestId('evaluation-form')).toBeInTheDocument();
    });

    it('should call useReservationLiveUpdates hook', () => {
        render(<AvaliarReservaPage reserva={mockReserva} semana={mockSemana} />);

        const mockUseReservationLiveUpdates = jest.mocked(UseReservationLiveUpdatesModule.useReservationLiveUpdates);
        expect(mockUseReservationLiveUpdates).toHaveBeenCalled();
    });

    it('should call useReservaRefreshOnEvent with correct only parameter', () => {
        render(<AvaliarReservaPage reserva={mockReserva} semana={mockSemana} />);

        const mockUseReservaRefreshOnEvent = jest.mocked(UseReservaRefreshOnEventModule.useReservaRefreshOnEvent);
        expect(mockUseReservaRefreshOnEvent).toHaveBeenCalled();
        // Verify the hook was called with options containing 'only' with 'reserva'
        expect(mockUseReservaRefreshOnEvent.mock.calls[0][0].only).toEqual(['reserva']);
    });

    it('should render ConflictAlertBox and ConflictCacheSnapshotPanel', () => {
        const { getByTestId } = render(
            <AvaliarReservaPage reserva={mockReserva} semana={mockSemana} todosOsConflitos={{}} conflictCacheSnapshot={null} />,
        );

        expect(getByTestId('conflict-alert-box')).toBeInTheDocument();
        expect(getByTestId('conflict-cache-snapshot-panel')).toBeInTheDocument();
    });

    it('should display loading state when validation status is PROCESSING', () => {
        const processingReserva: Reserva = {
            ...mockReserva,
            validation_status: ValidationStatus.PROCESSING,
        };

        const { queryByTestId } = render(<AvaliarReservaPage reserva={processingReserva} semana={mockSemana} />);

        expect(queryByTestId('generic-header')).not.toBeInTheDocument();
    });

    it('renderiza_titulo_da_avaliacao_como_unico_h1', () => {
        render(<AvaliarReservaPage reserva={mockReserva} semana={mockSemana} />);

        expect(screen.getByRole('heading', { level: 1, name: 'reservas.avaliacao.titulo' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    });

    it('exibe aviso informativo e oculta formulario de avaliacao quando reserva esta cancelada', () => {
        const canceladaReserva: Reserva = {
            ...mockReserva,
            situacao: 'inativa',
        };

        const { queryByTestId } = render(<AvaliarReservaPage reserva={canceladaReserva} semana={mockSemana} />);

        expect(screen.getByTestId('reserva-cancelada-alert')).toBeInTheDocument();
        expect(screen.getByText('reservas.avaliacao.cancelada_titulo')).toBeInTheDocument();
        expect(screen.getByText('reservas.avaliacao.cancelada_descricao')).toBeInTheDocument();
        expect(queryByTestId('evaluation-form')).not.toBeInTheDocument();
    });

    it('no escopo single envia apenas os horarios da semana visivel e aplica decisao global somente nela', () => {
        const { useReservationSlots: actualUseReservationSlots } =
            jest.requireActual<typeof import('@/hooks/use-reservation-slots')>('@/hooks/use-reservation-slots');

        const reservaMultiSemana: Reserva = {
            ...mockReserva,
            data_inicial: new Date('2026-11-24'),
            data_final: new Date('2026-12-08'),
            horarios: [
                {
                    id: 11,
                    data: '2026-11-24',
                    horario_inicio: '08:20:00',
                    horario_fim: '09:10:00',
                    situacao: SituacaoHorario.EM_ANALISE,
                    is_conflicted: false,
                    agenda: { id: 1, turno: Turno.MANHA, espaco: mockReserva.horarios[0].agenda?.espaco },
                },
                {
                    id: 12,
                    data: '2026-12-01',
                    horario_inicio: '08:20:00',
                    horario_fim: '09:10:00',
                    situacao: SituacaoHorario.EM_ANALISE,
                    is_conflicted: false,
                    agenda: { id: 1, turno: Turno.MANHA, espaco: mockReserva.horarios[0].agenda?.espaco },
                },
                {
                    id: 13,
                    data: '2026-12-08',
                    horario_inicio: '08:20:00',
                    horario_fim: '09:10:00',
                    situacao: SituacaoHorario.EM_ANALISE,
                    is_conflicted: false,
                    agenda: { id: 1, turno: Turno.MANHA, espaco: mockReserva.horarios[0].agenda?.espaco },
                },
            ],
        };

        const updaters: ((prev: Record<string, unknown>) => Record<string, unknown>)[] = [];
        const setDataSpy = jest.fn((arg: unknown) => {
            if (typeof arg === 'function') {
                updaters.push(arg as (prev: Record<string, unknown>) => Record<string, unknown>);
            }
        });

        jest.mocked(UseAgendaNavigationModule.useAgendaNavigation).mockReturnValue({
            semanaVisivel: new Date(2026, 10, 24),
            isLoading: false,
            podeVoltar: false,
            podeAvancar: true,
            irParaSemanaAnterior: jest.fn(),
            irParaProximaSemana: jest.fn(),
            irParaSemanaAtual: jest.fn(),
        });

        jest.mocked(UseReservationSlotsModule.useReservationSlots).mockImplementation((res) => actualUseReservationSlots(res));

        jest.mocked(UseAvaliarReservaModule.useAvaliarReserva).mockReturnValue({
            form: {
                data: {
                    situacao: SituacaoReserva.EM_ANALISE,
                    motivo: '',
                    observacao: '',
                    horarios_avaliados: [],
                    evaluation_scope: EscopoRecorrencia.SINGLE,
                },
                setData: setDataSpy,
                processing: false,
                errors: {},
            } as unknown as ReturnType<typeof UseAvaliarReservaModule.useAvaliarReserva>['form'],
            submitEvaluation: jest.fn(),
        });

        render(<AvaliarReservaPage reserva={reservaMultiSemana} semana={{ inicio: '2026-11-23', fim: '2026-11-29', referencia: '2026-11-24' }} />);

        fireEvent.click(screen.getByTestId('mock-deferir-btn'));

        expect(capturedEvaluationFormProps.slotsSelecao).toHaveLength(1);
        expect(capturedEvaluationFormProps.slotsSelecao?.[0]?.dadosReserva?.horarioDB.id).toBe(11);

        const lastUpdater = updaters.at(-1);

        expect(lastUpdater).toBeDefined();
        if (!lastUpdater) {
            throw new Error('Expected setData updater function to be called');
        }
        const atualizado = lastUpdater({ evaluation_scope: EscopoRecorrencia.SINGLE });
        expect(atualizado.situacao).toBe(SituacaoReserva.DEFERIDA);
        expect(atualizado.horarios_avaliados).toEqual([{ id: 11, status: SituacaoReserva.DEFERIDA }]);
    });

    it.each([
        ['pt-BR', 'Inativa / Cancelada'],
        ['en', 'Inactive / Canceled'],
        ['es', 'Inactiva / Cancelada'],
    ] as const)('traduz badge superior de situacao da reserva para %s usando SituacaoBadge (Obs. 1)', (locale, esperado) => {
        mockUseTranslationWithLocale(locale);

        render(
            <AvaliarReservaPage
                reserva={{
                    ...mockReserva,
                    situacao: SituacaoReserva.INATIVA,
                }}
                semana={mockSemana}
            />,
        );

        expect(screen.getByText(esperado)).toBeInTheDocument();
    });

    it.each([
        ['pt-BR', '- Horário das 10:00 do dia 20/08/2024: Indeferido. Conflito com outra reserva deferida neste horário.'],
        ['en', '- 10:00 slot on 20/08/2024: Rejected. Conflict with another approved reservation at this time.'],
        ['es', '- Horario de las 10:00 del día 20/08/2024: Rechazado. Conflicto con otra reserva aprobada en este horario.'],
    ] as const)('preenche parecer automatico de conflito inteiramente traduzido em %s (Obs. 2)', (locale, esperado) => {
        mockUseTranslationWithLocale(locale);

        const setDataSpy = jest.fn();
        jest.mocked(UseAvaliarReservaModule.useAvaliarReserva).mockReturnValue({
            form: {
                data: {
                    situacao: SituacaoReserva.EM_ANALISE,
                    motivo: '',
                    observacao: '',
                    horarios_avaliados: [],
                    evaluation_scope: EscopoRecorrencia.RECURRING,
                },
                setData: setDataSpy,
                processing: false,
                errors: {},
            } as unknown as ReturnType<typeof UseAvaliarReservaModule.useAvaliarReserva>['form'],
            submitEvaluation: jest.fn(),
        });

        render(
            <AvaliarReservaPage
                reserva={mockReserva}
                semana={mockSemana}
                todosOsConflitos={{
                    1: {
                        horario_checado_id: 1,
                        conflito_reserva_titulo: 'Reserva Concorrente',
                    },
                }}
            />,
        );

        expect(setDataSpy).toHaveBeenCalledWith('motivo', esperado);
    });
});
