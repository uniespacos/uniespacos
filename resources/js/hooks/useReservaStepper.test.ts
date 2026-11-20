import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { act, renderHook } from '@testing-library/react';
import { useReservaStepper } from './useReservaStepper';

describe('useReservaStepper', () => {
    let mockEspaco: Espaco;
    let mockFormData: ReservaFormData;
    let mockSlots: SlotCalendario[];

    beforeEach(() => {
        mockEspaco = {
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
                    ],
                },
            ],
            descricao: '',
            imagens: [],
            main_image_index: null,
        };

        mockSlots = [
            {
                id: '2026-08-25|08:00',
                data: new Date('2026-08-25T00:00:00'),
                horario_inicio: '08:00:00',
                horario_fim: '09:00:00',
                status: 'selecionado',
                agenda_id: 10,
            },
        ];

        mockFormData = {
            titulo: 'Aula de Programação',
            descricao: 'Prática de laboratório',
            recorrencia: 'unica',
            data_inicial: new Date('2026-08-25T00:00:00'),
            data_final: new Date('2026-08-31T00:00:00'),
            horarios_solicitados: [
                {
                    data: '2026-08-25',
                    horario_inicio: '08:00:00',
                    horario_fim: '09:00:00',
                    agenda_id: 10,
                },
            ],
            termo_responsabilidade: false,
        };
    });

    it('exposes the step titles and descriptions from the i18n dictionary', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: mockFormData,
                slotsSelecao: mockSlots,
            }),
        );

        expect(result.current.steps.map((step) => step.title)).toEqual(['Horários e Recorrência', 'Dados e Justificativa', 'Revisão e Confirmação']);
        expect(result.current.steps.map((step) => step.description)).toEqual([
            'Período e frequência',
            'Finalidade da solicitação',
            'Conferência e termos',
        ]);
    });

    it('initializes at step 1 with 3 defined steps', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: mockFormData,
                slotsSelecao: mockSlots,
            }),
        );

        expect(result.current.currentStepId).toBe('horarios_recorrencia');
        expect(result.current.currentStepIndex).toBe(0);
        expect(result.current.isFirstStep).toBe(true);
        expect(result.current.isLastStep).toBe(false);
        expect(result.current.steps).toHaveLength(3);
    });

    it('detects static conflicts in memory against existing deferida reservations', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: mockFormData,
                slotsSelecao: mockSlots,
            }),
        );

        expect(result.current.conflictingDates).toContain('25/08/2026');
        expect(result.current.hasAnyConflict).toBe(true);
    });

    it('advances to step 2 when step 1 is valid', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: mockFormData,
                slotsSelecao: mockSlots,
            }),
        );

        expect(result.current.canAdvance).toBe(true);

        let advanced = false;
        act(() => {
            advanced = result.current.nextStep();
        });

        expect(advanced).toBe(true);
        expect(result.current.currentStepId).toBe('dados_justificativa');
        expect(result.current.currentStepIndex).toBe(1);
    });

    it('blocks advancing when required fields are missing and produces errors', () => {
        const invalidFormData: ReservaFormData = {
            ...mockFormData,
            titulo: '',
            descricao: '',
        };

        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: invalidFormData,
                slotsSelecao: mockSlots,
                initialStep: 'dados_justificativa',
            }),
        );

        expect(result.current.canAdvance).toBe(false);

        let advanced = false;
        act(() => {
            advanced = result.current.nextStep();
        });

        expect(advanced).toBe(false);
        expect(result.current.stepErrors.titulo).toBeDefined();
        expect(result.current.stepErrors.descricao).toBeDefined();
    });

    it('navigates backward using prevStep', () => {
        const { result } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: mockFormData,
                slotsSelecao: mockSlots,
                initialStep: 'dados_justificativa',
            }),
        );

        expect(result.current.currentStepId).toBe('dados_justificativa');

        act(() => {
            result.current.prevStep();
        });

        expect(result.current.currentStepId).toBe('horarios_recorrencia');
    });

    it('rejeita publico_estimado com 0, negativos, decimais e valores acima de 5000 e aceita validos', () => {
        const valoresInvalidos: (number | string)[] = [0, -1, 1.5, '1.5', '0', '-5', 99999, '99999'];

        for (const invalido of valoresInvalidos) {
            const { result } = renderHook(() =>
                useReservaStepper({
                    espaco: mockEspaco,
                    formData: { ...mockFormData, publico_estimado: invalido },
                    slotsSelecao: mockSlots,
                    initialStep: 'dados_justificativa',
                }),
            );

            expect(result.current.canAdvance).toBe(false);
            expect(result.current.stepErrors.publico_estimado).toBe('Informe um número inteiro entre 1 e 5000.');

            let advanced = true;
            act(() => {
                advanced = result.current.nextStep();
            });
            expect(advanced).toBe(false);
        }

        const valoresValidos: (number | string | undefined)[] = [undefined, '', '1', 1, '40', 5000, '5000'];

        for (const valido of valoresValidos) {
            const { result } = renderHook(() =>
                useReservaStepper({
                    espaco: mockEspaco,
                    formData: { ...mockFormData, publico_estimado: valido },
                    slotsSelecao: mockSlots,
                    initialStep: 'dados_justificativa',
                }),
            );

            expect(result.current.canAdvance).toBe(true);
            expect(result.current.stepErrors.publico_estimado).toBeUndefined();
        }
    });

    it('aceita descricao com 2000 caracteres e bloqueia acima de 2000 ou titulo acima de 255', () => {
        const { result: okResult } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: { ...mockFormData, descricao: 'a'.repeat(2000) },
                slotsSelecao: mockSlots,
                initialStep: 'dados_justificativa',
            }),
        );
        expect(okResult.current.canAdvance).toBe(true);
        expect(okResult.current.stepErrors.descricao).toBeUndefined();

        const { result: failDesc } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: { ...mockFormData, descricao: 'a'.repeat(2001) },
                slotsSelecao: mockSlots,
                initialStep: 'dados_justificativa',
            }),
        );
        expect(failDesc.current.canAdvance).toBe(false);
        expect(failDesc.current.stepErrors.descricao).toContain('2000');

        const { result: failTitulo } = renderHook(() =>
            useReservaStepper({
                espaco: mockEspaco,
                formData: { ...mockFormData, titulo: 't'.repeat(256) },
                slotsSelecao: mockSlots,
                initialStep: 'dados_justificativa',
            }),
        );
        expect(failTitulo.current.canAdvance).toBe(false);
        expect(failTitulo.current.stepErrors.titulo).toContain('255');
    });
});
