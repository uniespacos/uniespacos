import { useCallback, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData, ReservaStepId, StepperStep } from '@/types/reserva-stepper';

export interface UseReservaStepperProps {
    espaco: Espaco;
    formData: ReservaFormData;
    slotsSelecao: SlotCalendario[];
    initialStep?: ReservaStepId;
    isEditMode?: boolean;
}

const STEP_DEFINITIONS: Omit<StepperStep, 'isCompleted' | 'isValid'>[] = [
    {
        id: 'horarios_recorrencia',
        title: 'Horários & Recorrência',
        description: 'Período e frequência',
        iconName: 'calendar',
    },
    {
        id: 'dados_justificativa',
        title: 'Dados & Justificativa',
        description: 'Finalidade da solicitação',
        iconName: 'file-text',
    },
    {
        id: 'revisao_confirmacao',
        title: 'Revisão & Envio',
        description: 'Conferência e termos',
        iconName: 'check-circle-2',
    },
];

export function useReservaStepper({ espaco, formData, slotsSelecao, initialStep = 'horarios_recorrencia' }: UseReservaStepperProps) {
    const [currentStepId, setCurrentStepId] = useState<ReservaStepId>(initialStep);
    const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
    const [hasRealtimeConflict, setHasRealtimeConflict] = useState(false);

    // Validação estática in-memory contra conflitos existentes nas agendas do espaço
    const conflictingDates = useMemo(() => {
        const conflitos: string[] = [];

        formData.horarios_solicitados.forEach((hSol) => {
            const dataSol = hSol.data;
            const hInicio = hSol.horario_inicio;
            const hFim = hSol.horario_fim;
            if (!dataSol || !hInicio || !hFim) return;

            let agendaId: number | undefined;
            if ('agenda_id' in hSol && typeof hSol.agenda_id === 'number') {
                agendaId = hSol.agenda_id;
            } else if ('agenda' in hSol && hSol.agenda && typeof hSol.agenda === 'object' && 'id' in hSol.agenda) {
                agendaId = (hSol.agenda as { id?: number }).id;
            }

            if (!agendaId) return;

            espaco.agendas?.forEach((agenda) => {
                if (agenda.id === agendaId) {
                    agenda.horarios?.forEach((hExist) => {
                        if (
                            hExist.data === dataSol &&
                            hExist.situacao === 'deferida' &&
                            hExist.horario_inicio < hFim &&
                            hExist.horario_fim > hInicio
                        ) {
                            try {
                                const dataFormatada = format(parseISO(dataSol), 'dd/MM/yyyy');
                                if (!conflitos.includes(dataFormatada)) {
                                    conflitos.push(dataFormatada);
                                }
                            } catch {
                                if (!conflitos.includes(dataSol)) {
                                    conflitos.push(dataSol);
                                }
                            }
                        }
                    });
                }
            });
        });

        return conflitos;
    }, [espaco.agendas, formData.horarios_solicitados]);

    // Verificação de validade por etapa
    const isStep1Valid = useMemo(() => {
        return (
            slotsSelecao.length > 0 &&
            formData.data_inicial !== null &&
            formData.data_inicial !== undefined &&
            formData.data_final !== null &&
            formData.data_final !== undefined
        );
    }, [slotsSelecao.length, formData.data_inicial, formData.data_final]);

    const isStep2Valid = useMemo(() => {
        return Boolean(formData.titulo.trim()) && Boolean(formData.descricao.trim());
    }, [formData.titulo, formData.descricao]);

    const isStep3Valid = useMemo(() => {
        return isStep1Valid && isStep2Valid && Boolean(formData.termo_responsabilidade);
    }, [isStep1Valid, isStep2Valid, formData.termo_responsabilidade]);

    const stepValidityMap: Record<ReservaStepId, boolean> = useMemo(
        () => ({
            horarios_recorrencia: isStep1Valid,
            dados_justificativa: isStep2Valid,
            revisao_confirmacao: isStep3Valid,
        }),
        [isStep1Valid, isStep2Valid, isStep3Valid],
    );

    const currentStepIndex = useMemo(() => STEP_DEFINITIONS.findIndex((s) => s.id === currentStepId), [currentStepId]);

    const steps: StepperStep[] = useMemo(() => {
        return STEP_DEFINITIONS.map((stepDef, idx) => {
            const isValid = stepValidityMap[stepDef.id];
            const isCompleted = idx < currentStepIndex && isValid;

            return {
                ...stepDef,
                isValid,
                isCompleted,
            };
        });
    }, [stepValidityMap, currentStepIndex]);

    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === STEP_DEFINITIONS.length - 1;

    const canAdvance = useMemo(() => {
        if (currentStepId === 'horarios_recorrencia') return isStep1Valid;
        if (currentStepId === 'dados_justificativa') return isStep2Valid;
        return isStep3Valid;
    }, [currentStepId, isStep1Valid, isStep2Valid, isStep3Valid]);

    const validateCurrentStep = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        if (currentStepId === 'horarios_recorrencia') {
            if (slotsSelecao.length === 0) {
                errors.slots = 'Selecione pelo menos um horário na grade.';
            }
            if (!formData.data_inicial) {
                errors.data_inicial = 'Data inicial é obrigatória.';
            }
            if (!formData.data_final) {
                errors.data_final = 'Data final é obrigatória.';
            }
        } else if (currentStepId === 'dados_justificativa') {
            if (!formData.titulo.trim()) {
                errors.titulo = 'O título da reserva é obrigatório.';
            }
            if (!formData.descricao.trim()) {
                errors.descricao = 'A justificativa/descrição é obrigatória.';
            }
        } else {
            if (!formData.termo_responsabilidade) {
                errors.termo_responsabilidade = 'É obrigatório aceitar o termo de responsabilidade.';
            }
        }

        setStepErrors(errors);
        return Object.keys(errors).length === 0;
    }, [currentStepId, slotsSelecao.length, formData]);

    const goToStep = useCallback(
        (stepId: ReservaStepId) => {
            const targetIdx = STEP_DEFINITIONS.findIndex((s) => s.id === stepId);
            // Só permite avançar livremente para passos anteriores ou para o próximo se o passo atual estiver válido
            if (targetIdx <= currentStepIndex || canAdvance) {
                setCurrentStepId(stepId);
                setStepErrors({});
            }
        },
        [currentStepIndex, canAdvance],
    );

    const nextStep = useCallback((): boolean => {
        if (!validateCurrentStep()) {
            return false;
        }

        if (currentStepIndex < STEP_DEFINITIONS.length - 1) {
            const nextDef = STEP_DEFINITIONS[currentStepIndex + 1];
            setCurrentStepId(nextDef.id);
            setStepErrors({});
            return true;
        }
        return false;
    }, [validateCurrentStep, currentStepIndex]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            const prevDef = STEP_DEFINITIONS[currentStepIndex - 1];
            setCurrentStepId(prevDef.id);
            setStepErrors({});
        }
    }, [currentStepIndex]);

    const resetStepper = useCallback(() => {
        setCurrentStepId('horarios_recorrencia');
        setStepErrors({});
        setHasRealtimeConflict(false);
    }, []);

    const onConflictDetected = useCallback((hasConflict: boolean) => {
        setHasRealtimeConflict(hasConflict);
    }, []);

    return {
        currentStepId,
        currentStepIndex,
        steps,
        isFirstStep,
        isLastStep,
        canAdvance,
        stepErrors,
        conflictingDates,
        hasRealtimeConflict,
        hasAnyConflict: conflictingDates.length > 0 || hasRealtimeConflict,
        goToStep,
        nextStep,
        prevStep,
        resetStepper,
        validateCurrentStep,
        onConflictDetected,
    };
}

export default useReservaStepper;
