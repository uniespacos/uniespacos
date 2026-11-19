import { SituacaoHorario } from '@/contracts';
import { useTranslation } from '@/i18n';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData, ReservaStepId, StepperStep } from '@/types/reserva-stepper';
import { format, parseISO } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';

const TITULO_MAX_LENGTH = 255;
const DESCRICAO_MAX_LENGTH = 2000;
const PUBLICO_ESTIMADO_MIN = 1;
const PUBLICO_ESTIMADO_MAX = 5000;

function isPublicoEstimadoValido(valor: number | string | undefined): boolean {
    if (valor === undefined || valor === '') {
        return true;
    }

    if (typeof valor === 'string') {
        const trimmed = valor.trim();
        if (trimmed === '') {
            return true;
        }
        if (!/^-?\d+$/.test(trimmed)) {
            return false;
        }
        const numero = Number(trimmed);
        return Number.isInteger(numero) && numero >= PUBLICO_ESTIMADO_MIN && numero <= PUBLICO_ESTIMADO_MAX;
    }

    return Number.isInteger(valor) && valor >= PUBLICO_ESTIMADO_MIN && valor <= PUBLICO_ESTIMADO_MAX;
}

export interface UseReservaStepperProps {
    espaco: Espaco;
    formData: ReservaFormData;
    slotsSelecao: SlotCalendario[];
    initialStep?: ReservaStepId;
    isEditMode?: boolean;
}

export function useReservaStepper({ espaco, formData, slotsSelecao, initialStep = 'horarios_recorrencia' }: UseReservaStepperProps) {
    const { t } = useTranslation();
    const [currentStepId, setCurrentStepId] = useState<ReservaStepId>(initialStep);
    const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
    const [hasRealtimeConflict, setHasRealtimeConflict] = useState(false);

    const stepDefinitions = useMemo<Omit<StepperStep, 'isCompleted' | 'isValid'>[]>(
        () => [
            {
                id: 'horarios_recorrencia',
                title: t('reservas.stepper.step1_title'),
                description: t('reservas.stepper.step1_desc'),
                iconName: 'calendar',
            },
            {
                id: 'dados_justificativa',
                title: t('reservas.stepper.step2_title'),
                description: t('reservas.stepper.step2_desc'),
                iconName: 'file-text',
            },
            {
                id: 'revisao_confirmacao',
                title: t('reservas.stepper.step3_title'),
                description: t('reservas.stepper.step3_desc'),
                iconName: 'check-circle-2',
            },
        ],
        [t],
    );

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
                            hExist.situacao === SituacaoHorario.DEFERIDA &&
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
        return (
            formData.titulo.trim().length > 0 &&
            formData.titulo.length <= TITULO_MAX_LENGTH &&
            formData.descricao.trim().length > 0 &&
            formData.descricao.length <= DESCRICAO_MAX_LENGTH &&
            isPublicoEstimadoValido(formData.publico_estimado)
        );
    }, [formData.titulo, formData.descricao, formData.publico_estimado]);

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

    const currentStepIndex = useMemo(() => stepDefinitions.findIndex((s) => s.id === currentStepId), [stepDefinitions, currentStepId]);

    const steps: StepperStep[] = useMemo(() => {
        return stepDefinitions.map((stepDef, idx) => {
            const isValid = stepValidityMap[stepDef.id];
            const isCompleted = idx < currentStepIndex && isValid;

            return {
                ...stepDef,
                isValid,
                isCompleted,
            };
        });
    }, [stepDefinitions, stepValidityMap, currentStepIndex]);

    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === stepDefinitions.length - 1;

    const canAdvance = useMemo(() => {
        if (currentStepId === 'horarios_recorrencia') return isStep1Valid;
        if (currentStepId === 'dados_justificativa') return isStep2Valid;
        return isStep3Valid;
    }, [currentStepId, isStep1Valid, isStep2Valid, isStep3Valid]);

    const validateCurrentStep = useCallback((): boolean => {
        const errors: Record<string, string> = {};

        if (currentStepId === 'horarios_recorrencia') {
            if (slotsSelecao.length === 0) {
                errors.slots = t('reservas.stepper.error_slots_required');
            }
            if (!formData.data_inicial) {
                errors.data_inicial = t('reservas.stepper.error_start_date_required');
            }
            if (!formData.data_final) {
                errors.data_final = t('reservas.stepper.error_end_date_required');
            }
        } else if (currentStepId === 'dados_justificativa') {
            if (!formData.titulo.trim()) {
                errors.titulo = t('reservas.stepper.error_titulo_required');
            } else if (formData.titulo.length > TITULO_MAX_LENGTH) {
                errors.titulo = t('reservas.stepper.error_titulo_max', { max: TITULO_MAX_LENGTH });
            }

            if (!formData.descricao.trim()) {
                errors.descricao = t('reservas.stepper.error_descricao_required');
            } else if (formData.descricao.length > DESCRICAO_MAX_LENGTH) {
                errors.descricao = t('reservas.stepper.error_descricao_max', { max: DESCRICAO_MAX_LENGTH });
            }

            if (!isPublicoEstimadoValido(formData.publico_estimado)) {
                errors.publico_estimado = t('reservas.stepper.error_publico_estimado_invalido');
            }
        } else {
            if (!formData.termo_responsabilidade) {
                errors.termo_responsabilidade = t('reservas.stepper.error_terms_required');
            }
        }

        setStepErrors(errors);
        return Object.keys(errors).length === 0;
    }, [currentStepId, slotsSelecao.length, formData, t]);

    const liveStep2Errors = useMemo(() => {
        if (currentStepId !== 'dados_justificativa') {
            return {};
        }

        const errors: Record<string, string> = {};
        if (formData.titulo.length > TITULO_MAX_LENGTH) {
            errors.titulo = t('reservas.stepper.error_titulo_max', { max: TITULO_MAX_LENGTH });
        }
        if (formData.descricao.length > DESCRICAO_MAX_LENGTH) {
            errors.descricao = t('reservas.stepper.error_descricao_max', { max: DESCRICAO_MAX_LENGTH });
        }
        if (!isPublicoEstimadoValido(formData.publico_estimado)) {
            errors.publico_estimado = t('reservas.stepper.error_publico_estimado_invalido');
        }
        return errors;
    }, [currentStepId, formData.titulo, formData.descricao, formData.publico_estimado, t]);

    const mergedStepErrors = useMemo(() => {
        const base: Record<string, string> = {};
        if (stepErrors.slots && slotsSelecao.length === 0) {
            base.slots = stepErrors.slots;
        }
        if (stepErrors.data_inicial && !formData.data_inicial) {
            base.data_inicial = stepErrors.data_inicial;
        }
        if (stepErrors.data_final && !formData.data_final) {
            base.data_final = stepErrors.data_final;
        }
        if (stepErrors.titulo && !formData.titulo.trim()) {
            base.titulo = stepErrors.titulo;
        }
        if (stepErrors.descricao && !formData.descricao.trim()) {
            base.descricao = stepErrors.descricao;
        }
        if (stepErrors.termo_responsabilidade && !formData.termo_responsabilidade) {
            base.termo_responsabilidade = stepErrors.termo_responsabilidade;
        }
        return { ...base, ...liveStep2Errors };
    }, [
        stepErrors,
        liveStep2Errors,
        slotsSelecao.length,
        formData.data_inicial,
        formData.data_final,
        formData.titulo,
        formData.descricao,
        formData.termo_responsabilidade,
    ]);

    const goToStep = useCallback(
        (stepId: ReservaStepId) => {
            const targetIdx = stepDefinitions.findIndex((s) => s.id === stepId);
            // Só permite avançar livremente para passos anteriores ou para o próximo se o passo atual estiver válido
            if (targetIdx <= currentStepIndex || canAdvance) {
                setCurrentStepId(stepId);
                setStepErrors({});
            }
        },
        [stepDefinitions, currentStepIndex, canAdvance],
    );

    const nextStep = useCallback((): boolean => {
        if (!validateCurrentStep()) {
            return false;
        }

        if (currentStepIndex < stepDefinitions.length - 1) {
            const nextDef = stepDefinitions[currentStepIndex + 1];
            setCurrentStepId(nextDef.id);
            setStepErrors({});
            return true;
        }
        return false;
    }, [validateCurrentStep, currentStepIndex, stepDefinitions]);

    const prevStep = useCallback(() => {
        if (currentStepIndex > 0) {
            const prevDef = stepDefinitions[currentStepIndex - 1];
            setCurrentStepId(prevDef.id);
            setStepErrors({});
        }
    }, [currentStepIndex, stepDefinitions]);

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
        stepErrors: mergedStepErrors,
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
