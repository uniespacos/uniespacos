import { EscopoRecorrencia, RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import { type Espaco, type Horario, type Reserva, type SlotCalendario, type User } from '@/types';
import { type ReservaFormData } from '@/types/reserva-stepper';
import { act, renderHook } from '@testing-library/react';
import { format } from 'date-fns';
import { useAgendaSelection } from './use-agenda-selection';

jest.mock('@inertiajs/react', () => {
    const React = jest.requireActual<typeof import('react')>('react');

    type Dados = Record<string, unknown>;
    type Atualizador = (prev: Dados) => Dados;

    return {
        useForm: (initialValues: Dados) => {
            const [data, setEstado] = React.useState<Dados>(initialValues);

            const setData = React.useCallback((arg: Atualizador | string | Dados, valor?: unknown) => {
                setEstado((prev) => {
                    if (typeof arg === 'function') {
                        return arg(prev);
                    }
                    if (typeof arg === 'string') {
                        return { ...prev, [arg]: valor };
                    }
                    return { ...prev, ...arg };
                });
            }, []);

            return {
                data,
                setData,
                post: jest.fn(),
                patch: jest.fn(),
                processing: false,
                reset: jest.fn(),
                errors: {},
            };
        },
    };
});

// Relógio congelado em 25/05/2026 12:00 (horário local), anterior às datas de junho usadas nos testes.
const AGORA_CONGELADO = new Date(2026, 4, 25, 12, 0, 0);

function criarSlot(data: Date, horarioInicio = '08:20:00'): SlotCalendario {
    return {
        id: `${format(data, 'yyyy-MM-dd')}|${horarioInicio}`,
        status: 'solicitado',
        data,
        horario_inicio: horarioInicio,
        horario_fim: '09:10:00',
        agenda_id: 2,
        isPast: false,
    };
}

describe('useAgendaSelection: recorrencia e data inicial', () => {
    let mockEspaco: Espaco;

    beforeEach(() => {
        jest.useFakeTimers({ now: AGORA_CONGELADO });

        mockEspaco = {
            id: 1,
            nome: 'Auditório',
            agendas: [],
            capacidade_pessoas: 100,
            descricao: '',
            imagens: [],
            main_image_index: null,
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('mudar a recorrencia nao sobrescreve a data inicial escolhida pelo usuario', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date(2026, 5, 1),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(criarSlot(new Date(2026, 5, 3)));
        });

        act(() => {
            result.current.setFormData('data_inicial', new Date(2026, 5, 10));
        });

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.QUINZE_DIAS);
        });

        expect(result.current.formData.recorrencia).toBe(RecorrenciaReserva.QUINZE_DIAS);
        expect(result.current.formData.data_inicial).toEqual(new Date(2026, 5, 10));
        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 24));
    });

    it('selecionar slots define a data inicial como o menor slot selecionado', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date(2026, 5, 1),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(criarSlot(new Date(2026, 5, 10)));
        });

        act(() => {
            result.current.alternarSelecaoSlot(criarSlot(new Date(2026, 5, 3)));
        });

        expect(result.current.formData.data_inicial).toEqual(new Date(2026, 5, 3));
        expect(result.current.formData.horarios_solicitados).toHaveLength(2);
    });

    it('mantem data_final cobrindo o maior slot ao selecionar multiplas semanas e periodos', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date(2026, 5, 1),
            }),
        );

        const slotNoiteOutroTurno: SlotCalendario = {
            ...criarSlot(new Date(2026, 5, 25), '19:00:00'),
            horario_fim: '19:50:00',
            agenda_id: 3,
        };

        act(() => {
            result.current.alternarSelecaoSlot(criarSlot(new Date(2026, 5, 3)));
        });

        act(() => {
            result.current.alternarSelecaoSlot(slotNoiteOutroTurno);
        });

        expect(result.current.formData.horarios_solicitados).toHaveLength(2);
        expect(result.current.formData.data_inicial).toEqual(new Date(2026, 5, 3));
        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 25));

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.QUINZE_DIAS);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 25));

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.PERSONALIZADO);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 25));
    });

    it('recalcula data_final quando data_inicial muda com recorrencia predefinida ativa', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date(2026, 5, 1),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(criarSlot(new Date(2026, 5, 3)));
        });

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.QUINZE_DIAS);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 17));

        act(() => {
            result.current.setFormData('data_inicial', new Date(2026, 5, 10));
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 5, 24));
    });
});

describe('useAgendaSelection: propagacao da edicao recorrente', () => {
    const AGENDA_MANHA = 2;
    const AGENDA_TARDE = 3;

    function slotDoHorario(data: Date, agendaId: number, horarioInicio: string, horarioFim: string): SlotCalendario {
        return {
            id: `${format(data, 'yyyy-MM-dd')}|${horarioInicio}`,
            status: 'solicitado',
            data,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim,
            agenda_id: agendaId,
            isPast: false,
        };
    }

    const T1 = new Date(2026, 10, 24);
    const T2 = new Date(2026, 11, 1);
    const T3 = new Date(2026, 11, 8);

    const SLOT_MANHA_T1 = slotDoHorario(T1, AGENDA_MANHA, '07:30:00', '08:20:00');
    const SLOT_TARDE_T1 = slotDoHorario(T1, AGENDA_TARDE, '13:10:00', '14:00:00');

    function criarReservaRecorrente(recorrencia: Reserva['recorrencia']): Reserva {
        const horarios: Horario[] = [T1, T2, T3].map((data, idx) => ({
            id: idx + 1,
            data: format(data, 'yyyy-MM-dd'),
            horario_inicio: '07:30:00',
            horario_fim: '08:20:00',
            situacao: 'deferida',
            agenda: { id: AGENDA_MANHA, turno: 'manha' },
        }));

        return {
            id: 100,
            titulo: 'Reserva Recorrente',
            descricao: '',
            data_inicial: new Date(2026, 10, 24),
            data_final: new Date(2026, 11, 8),
            recorrencia,
            observacao: '',
            created_at: '',
            updated_at: '',
            situacao: 'em_analise',
            horarios,
            user: { id: 10, name: 'Solicitante' } as User,
        };
    }

    interface PayloadEsperado {
        data: string;
        horario_inicio: string;
        agenda_id: number;
    }

    function esperarPayload(horarios: ReservaFormData['horarios_solicitados'], esperados: PayloadEsperado[]) {
        expect(horarios).toHaveLength(esperados.length);
        expect(horarios).toEqual(expect.arrayContaining(esperados.map((esperado): unknown => expect.objectContaining(esperado))));
    }

    const TARDE_NAS_TRES_SEMANAS: PayloadEsperado[] = [
        { data: '2026-11-24', horario_inicio: '13:10:00', agenda_id: AGENDA_TARDE },
        { data: '2026-12-01', horario_inicio: '13:10:00', agenda_id: AGENDA_TARDE },
        { data: '2026-12-08', horario_inicio: '13:10:00', agenda_id: AGENDA_TARDE },
    ];

    const TROCA_SO_PRIMEIRA_SEMANA: PayloadEsperado[] = [
        { data: '2026-11-24', horario_inicio: '13:10:00', agenda_id: AGENDA_TARDE },
        { data: '2026-12-01', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
        { data: '2026-12-08', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
    ];

    let mockEspaco: Espaco;

    beforeEach(() => {
        jest.useFakeTimers({ now: AGORA_CONGELADO });

        mockEspaco = {
            id: 1,
            nome: 'Auditório',
            agendas: [],
            capacidade_pessoas: 100,
            descricao: '',
            imagens: [],
            main_image_index: null,
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('troca de turno em uma semana propaga para todas as ocorrencias no escopo recorrente (E-01)', () => {
        const reserva = criarReservaRecorrente('personalizado');
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(SLOT_MANHA_T1);
        });
        act(() => {
            result.current.alternarSelecaoSlot(SLOT_TARDE_T1);
        });

        esperarPayload(result.current.formData.horarios_solicitados, TARDE_NAS_TRES_SEMANAS);
    });

    it('remover um horario em uma semana remove as demais ocorrencias do mesmo dia da semana', () => {
        const reserva = criarReservaRecorrente('personalizado');
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(SLOT_MANHA_T1);
        });

        expect(result.current.formData.horarios_solicitados).toEqual([]);
    });

    it('escopo apenas esta semana nao propaga e alternar de volta ao escopo recorrente recalcula o payload', () => {
        const reserva = criarReservaRecorrente('personalizado');
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(SLOT_MANHA_T1);
        });
        act(() => {
            result.current.alternarSelecaoSlot(SLOT_TARDE_T1);
        });
        act(() => {
            result.current.setFormData('edit_scope', 'single');
        });

        esperarPayload(result.current.formData.horarios_solicitados, TROCA_SO_PRIMEIRA_SEMANA);

        act(() => {
            result.current.setFormData('edit_scope', 'recurring');
        });

        esperarPayload(result.current.formData.horarios_solicitados, TARDE_NAS_TRES_SEMANAS);
    });

    it('recorrencia unica nao propaga a troca de turno', () => {
        const reserva = criarReservaRecorrente('unica');
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.alternarSelecaoSlot(SLOT_MANHA_T1);
        });
        act(() => {
            result.current.alternarSelecaoSlot(SLOT_TARDE_T1);
        });

        esperarPayload(result.current.formData.horarios_solicitados, TROCA_SO_PRIMEIRA_SEMANA);
    });

    it('criacao de reserva nao propaga o horario selecionado', () => {
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                isEditMode: false,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.PERSONALIZADO);
        });
        act(() => {
            result.current.alternarSelecaoSlot(SLOT_MANHA_T1);
        });

        esperarPayload(result.current.formData.horarios_solicitados, [{ data: '2026-11-24', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA }]);
    });

    it('encurtar recorrencia de 1 mes para 15 dias em edicao recurring recalcula data_final e poda horarios excedentes (E-11)', () => {
        const datasCincoSemanas = [T1, T2, T3, new Date(2026, 11, 15), new Date(2026, 11, 22)];
        const reservaUmMes: Reserva = {
            ...criarReservaRecorrente(RecorrenciaReserva.UM_MES),
            data_final: new Date(2026, 11, 22),
            horarios: datasCincoSemanas.map((data, idx) => ({
                id: idx + 1,
                data: format(data, 'yyyy-MM-dd'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
                situacao: 'em_analise',
                agenda: { id: AGENDA_MANHA, turno: 'manha' },
            })),
        };

        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva: reservaUmMes,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.setFormData('edit_scope', EscopoRecorrencia.RECURRING);
            result.current.setFormData('recorrencia', RecorrenciaReserva.QUINZE_DIAS);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 11, 8));
        esperarPayload(result.current.formData.horarios_solicitados, [
            { data: '2026-11-24', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-01', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-08', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
        ]);
    });

    it('mudar de 15 dias para unica preserva os horarios marcados (E-10)', () => {
        const reservaQuinzeDias = criarReservaRecorrente(RecorrenciaReserva.QUINZE_DIAS);
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva: reservaQuinzeDias,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.UNICA);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 11, 8));
        esperarPayload(result.current.formData.horarios_solicitados, [
            { data: '2026-11-24', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-01', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-08', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
        ]);
    });

    it('estender de 15 dias para 1 mes nao duplica horarios existentes e atualiza data_final (E-12)', () => {
        const reservaQuinzeDias = criarReservaRecorrente(RecorrenciaReserva.QUINZE_DIAS);
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva: reservaQuinzeDias,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        act(() => {
            result.current.setFormData('recorrencia', RecorrenciaReserva.UM_MES);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 11, 24));
        esperarPayload(result.current.formData.horarios_solicitados, [
            { data: '2026-11-24', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-01', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
            { data: '2026-12-08', horario_inicio: '07:30:00', agenda_id: AGENDA_MANHA },
        ]);
    });

    it('no modo personalizado adicionar slot apos data_final expande data_final (O-09)', () => {
        const reservaPersonalizada = criarReservaRecorrente(RecorrenciaReserva.PERSONALIZADO);
        const { result } = renderHook(() =>
            useAgendaSelection({
                espaco: mockEspaco,
                reserva: reservaPersonalizada,
                isEditMode: true,
                semanaVisivel: new Date(2026, 10, 23),
            }),
        );

        const slotFuturo = slotDoHorario(new Date(2026, 11, 22), AGENDA_MANHA, '07:30:00', '08:20:00');
        act(() => {
            result.current.alternarSelecaoSlot(slotFuturo);
        });

        expect(result.current.formData.data_final).toEqual(new Date(2026, 11, 22));
    });
});
