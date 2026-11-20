import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { act, renderHook } from '@testing-library/react';
import { useReservaStepper } from './useReservaStepper';

function criarEspaco(): Espaco {
    return {
        id: 1,
        nome: 'Laboratório 01',
        capacidade_pessoas: 30,
        agendas: [
            {
                id: 10,
                turno: 'manha',
                horarios: [
                    {
                        id: 101,
                        data: '2026-08-25',
                        horario_inicio: '08:00:00',
                        horario_fim: '09:00:00',
                        situacao: 'deferida',
                    },
                    {
                        id: 102,
                        data: '2026-08-25',
                        horario_inicio: '10:00:00',
                        horario_fim: '11:00:00',
                        situacao: 'em_analise',
                    },
                ],
            },
        ],
        descricao: '',
        imagens: [],
        main_image_index: null,
    };
}

function criarSlot(id: string, data: Date, horarioInicio: string, horarioFim: string, agendaId = 10): SlotCalendario {
    return {
        id,
        status: 'selecionado',
        data,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        agenda_id: agendaId,
    };
}

function criarFormData(overrides: Partial<ReservaFormData> = {}): ReservaFormData {
    return {
        titulo: 'Aula de Programação',
        descricao: '',
        recorrencia: 'unica',
        data_inicial: new Date(2026, 7, 25),
        data_final: new Date(2026, 7, 25),
        horarios_solicitados: [{ data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 10 }],
        termo_responsabilidade: false,
        ...overrides,
    };
}

describe('useReservaStepper', () => {
    let slotLivre: SlotCalendario;
    let slotEmConflito: SlotCalendario;

    beforeEach(() => {
        slotEmConflito = criarSlot('2026-08-25|08:00:00', new Date(2026, 7, 25), '08:00:00', '09:00:00');
        slotLivre = criarSlot('2026-08-25|12:00:00', new Date(2026, 7, 25), '12:00:00', '13:00:00');
    });

    it('expõe os dois passos com títulos e descrições do dicionário', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [slotLivre] }));

        expect(result.current.steps.map((step) => step.title)).toEqual(['Detalhes', 'Revisar']);
        expect(result.current.steps.map((step) => step.description)).toEqual(['O que vai acontecer', 'Conferência e envio']);
    });

    it('inicia no passo detalhes', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [slotLivre] }));

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.isFirstStep).toBe(true);
        expect(result.current.isLastStep).toBe(false);
        expect(result.current.steps).toHaveLength(2);
    });

    it('detecta conflitos estáticos por data contra reservas deferidas', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [slotEmConflito] }));

        expect(result.current.conflictingDates).toEqual(['25/08/2026']);
        expect(result.current.hasAnyConflict).toBe(true);
    });

    it('identifica o slot em conflito, e só ele, pela chave do slot', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData(),
                slotsSelecao: [slotEmConflito, slotLivre],
            }),
        );

        expect(result.current.conflictingSlotIds).toEqual([slotEmConflito.id]);
    });

    it('ignora horários apenas em análise ao detectar conflito', () => {
        const formDataSemDeferido = criarFormData({
            horarios_solicitados: [{ data: '2026-08-25', horario_inicio: '10:00:00', horario_fim: '11:00:00', agenda_id: 10 }],
        });
        const slotEmAnalise = criarSlot('2026-08-25|10:00:00', new Date(2026, 7, 25), '10:00:00', '11:00:00');

        const { result } = renderHook(() =>
            useReservaStepper({ espaco: criarEspaco(), formData: formDataSemDeferido, slotsSelecao: [slotEmAnalise] }),
        );

        expect(result.current.conflictingDates).toEqual([]);
        expect(result.current.conflictingSlotIds).toEqual([]);
        expect(result.current.hasAnyConflict).toBe(false);
    });

    it('marca o slot de origem e expõe a data futura em conflictingDates quando uma ocorrência da recorrência colide', () => {
        const slotSemanal = criarSlot('2026-08-18|08:00:00', new Date(2026, 7, 18), '08:00:00', '09:00:00');

        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({
                    recorrencia: '15dias',
                    data_inicial: new Date(2026, 7, 18),
                    data_final: new Date(2026, 7, 31),
                    horarios_solicitados: [{ data: '2026-08-18', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 10 }],
                }),
                slotsSelecao: [slotSemanal, slotLivre],
            }),
        );

        expect(result.current.conflictingSlotIds).toEqual([slotSemanal.id]);
        expect(result.current.conflictingDates).toEqual(['25/08/2026']);
        expect(result.current.hasAnyConflict).toBe(true);
    });

    it('no escopo de semana única da edição não expande a recorrência para detectar conflito', () => {
        const slotSemanal = criarSlot('2026-08-18|08:00:00', new Date(2026, 7, 18), '08:00:00', '09:00:00');

        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                isEditMode: true,
                formData: criarFormData({
                    recorrencia: '15dias',
                    edit_scope: 'single',
                    data_inicial: new Date(2026, 7, 18),
                    data_final: new Date(2026, 7, 31),
                    horarios_solicitados: [{ data: '2026-08-18', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 10 }],
                }),
                slotsSelecao: [slotSemanal],
            }),
        );

        expect(result.current.conflictingSlotIds).toEqual([]);
        expect(result.current.conflictingDates).toEqual([]);
    });

    it('bloqueia avançar sem título e exibe erro inline', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ titulo: '   ', horarios_solicitados: [] }),
                slotsSelecao: [slotLivre],
            }),
        );

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.stepErrors.titulo).toBe('O título da reserva é obrigatório.');
    });

    it('não exige justificativa (descrição) para avançar', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ descricao: '' }),
                slotsSelecao: [slotLivre],
            }),
        );

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.currentStepId).toBe('revisao');
        expect(result.current.stepErrors).toEqual({});
    });

    it('bloqueia avançar com público estimado fora de 1..5000', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ publico_estimado: 6000 }),
                slotsSelecao: [slotLivre],
            }),
        );

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.stepErrors.publico_estimado).toBe('Informe um número inteiro entre 1 e 5000.');
    });

    it('bloqueia avançar quando a data final é anterior à inicial', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ data_inicial: new Date(2026, 7, 25), data_final: new Date(2026, 7, 20) }),
                slotsSelecao: [slotLivre],
            }),
        );

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.stepErrors.data_final).toBe('A data final deve ser igual ou posterior à data inicial.');
    });

    it('não permite avançar sem nenhum horário selecionado', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [] }));

        expect(result.current.canAdvance).toBe(false);

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.stepErrors.slots).toBe('Selecione pelo menos um horário na grade.');
    });

    it('avança para a revisão quando os detalhes são válidos', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [slotLivre] }));

        act(() => {
            result.current.nextStep();
        });

        expect(result.current.currentStepId).toBe('revisao');
        expect(result.current.isLastStep).toBe(true);
    });

    it('só permite enviar com termo aceito e sem conflito conhecido', () => {
        const { result, rerender } = renderHook(
            ({ termo }: { termo: boolean }) =>
                useReservaStepper({
                    espaco: criarEspaco(),
                    formData: criarFormData({ horarios_solicitados: [], termo_responsabilidade: termo }),
                    slotsSelecao: [slotLivre],
                }),
            { initialProps: { termo: false } },
        );

        expect(result.current.canSubmit).toBe(false);
        expect(result.current.bloqueios.termo).toBe(true);

        rerender({ termo: true });

        expect(result.current.canSubmit).toBe(true);
    });

    it('bloqueia o envio enquanto houver conflito conhecido, mesmo com termo aceito', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ termo_responsabilidade: true }),
                slotsSelecao: [slotEmConflito],
            }),
        );

        expect(result.current.bloqueios.conflito).toBe(true);
        expect(result.current.canSubmit).toBe(false);
    });

    it('remove da seleção somente os slots em conflito', () => {
        const setSlotsSelecao = jest.fn();

        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData(),
                slotsSelecao: [slotEmConflito, slotLivre],
                setSlotsSelecao,
            }),
        );

        act(() => {
            result.current.removerSlotsEmConflito();
        });

        expect(setSlotsSelecao).toHaveBeenCalledWith([slotLivre]);
    });

    it('trata conflito em tempo real pelo id do slot e libera o bloqueio quando o slot sai da seleção', () => {
        const setSlotsSelecao = jest.fn();

        const { result, rerender } = renderHook(
            ({ slots }: { slots: SlotCalendario[] }) =>
                useReservaStepper({
                    espaco: criarEspaco(),
                    formData: criarFormData({ termo_responsabilidade: true, horarios_solicitados: [] }),
                    slotsSelecao: slots,
                    setSlotsSelecao,
                }),
            { initialProps: { slots: [slotLivre] } },
        );

        expect(result.current.canSubmit).toBe(true);

        act(() => {
            result.current.onRealtimeSlotsConflict([slotLivre.id]);
        });

        expect(result.current.conflictingSlotIds).toEqual([slotLivre.id]);
        expect(result.current.canSubmit).toBe(false);

        act(() => {
            result.current.removerSlotsEmConflito();
        });

        expect(setSlotsSelecao).toHaveBeenCalledWith([]);

        rerender({ slots: [] });

        expect(result.current.conflictingSlotIds).toEqual([]);
    });

    it('volta para detalhes com prevStep e limpa erros', () => {
        const { result } = renderHook(() => useReservaStepper({ espaco: criarEspaco(), formData: criarFormData(), slotsSelecao: [slotLivre] }));

        act(() => {
            result.current.nextStep();
        });
        act(() => {
            result.current.prevStep();
        });

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.stepErrors).toEqual({});
    });

    it('resetStepper devolve ao passo detalhes e descarta erros e conflitos em tempo real', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ titulo: '' }),
                slotsSelecao: [slotLivre],
            }),
        );

        act(() => {
            result.current.nextStep();
            result.current.onRealtimeSlotsConflict([slotLivre.id]);
        });
        act(() => {
            result.current.resetStepper();
        });

        expect(result.current.currentStepId).toBe('detalhes');
        expect(result.current.stepErrors).toEqual({});
        expect(result.current.conflictingSlotIds).toEqual([]);
    });

    it('rejeita publico_estimado com 0, negativos, decimais e valores acima de 5000 e aceita validos', () => {
        const valoresInvalidos: (number | string)[] = [0, -1, 1.5, '1.5', '0', '-5', 99999, '99999'];

        for (const invalido of valoresInvalidos) {
            const { result } = renderHook(() =>
                useReservaStepper({
                    espaco: criarEspaco(),
                    formData: criarFormData({ publico_estimado: invalido }),
                    slotsSelecao: [slotLivre],
                }),
            );

            expect(result.current.bloqueios.detalhes).toBe(true);
            expect(result.current.canSubmit).toBe(false);
            expect(result.current.stepErrors.publico_estimado).toBe('Informe um número inteiro entre 1 e 5000.');

            let advanced = true;
            act(() => {
                advanced = result.current.nextStep();
            });
            expect(advanced).toBe(false);
            expect(result.current.currentStepId).toBe('detalhes');
        }

        const valoresValidos: (number | string | null | undefined)[] = [undefined, null, '', '   ', '1', 1, '40', 5000, '5000'];

        for (const valido of valoresValidos) {
            const { result } = renderHook(() =>
                useReservaStepper({
                    espaco: criarEspaco(),
                    formData: criarFormData({ publico_estimado: valido }),
                    slotsSelecao: [slotLivre],
                }),
            );

            expect(result.current.bloqueios.detalhes).toBe(false);
            expect(result.current.stepErrors.publico_estimado).toBeUndefined();
        }
    });

    it('aceita descricao com 2000 caracteres e bloqueia acima de 2000 ou titulo acima de 255', () => {
        const { result: okResult } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ descricao: 'a'.repeat(2000) }),
                slotsSelecao: [slotLivre],
            }),
        );
        expect(okResult.current.bloqueios.detalhes).toBe(false);
        expect(okResult.current.stepErrors.descricao).toBeUndefined();

        let avancaCom2000 = false;
        act(() => {
            avancaCom2000 = okResult.current.nextStep();
        });
        expect(avancaCom2000).toBe(true);
        expect(okResult.current.currentStepId).toBe('revisao');

        const { result: failDesc } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ descricao: 'a'.repeat(2001) }),
                slotsSelecao: [slotLivre],
            }),
        );
        expect(failDesc.current.bloqueios.detalhes).toBe(true);
        expect(failDesc.current.stepErrors.descricao).toContain('2000');
        let avancaCom2001 = true;
        act(() => {
            avancaCom2001 = failDesc.current.nextStep();
        });
        expect(avancaCom2001).toBe(false);

        const { result: failTitulo } = renderHook(() =>
            useReservaStepper({
                espaco: criarEspaco(),
                formData: criarFormData({ titulo: 't'.repeat(256) }),
                slotsSelecao: [slotLivre],
            }),
        );
        expect(failTitulo.current.bloqueios.detalhes).toBe(true);
        expect(failTitulo.current.stepErrors.titulo).toContain('255');
        let avancaCom256 = true;
        act(() => {
            avancaCom256 = failTitulo.current.nextStep();
        });
        expect(avancaCom256).toBe(false);
    });
});
