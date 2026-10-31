import { RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import { type Espaco, type SlotCalendario } from '@/types';
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
});
