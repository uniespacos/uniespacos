import { EscopoRecorrencia } from '@/contracts';
import { useTranslation } from '@/i18n';
import { datasEmConflito, recorrenciaParaGravar, slotsEmConflito } from '@/lib/utils/conflitos-reserva';
import { expandirHorariosRecorrencia } from '@/lib/utils/expandir-horarios-recorrencia';
import { publicoEstimadoValido } from '@/lib/utils/publico-estimado';
import { Espaco, SlotCalendario } from '@/types';
import { ErrosEtapa, ReservaFormData, ReservaStepId, StepperStep } from '@/types/reserva-stepper';
import { format, startOfDay } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';

const TITULO_MAX_LENGTH = 255;
const DESCRICAO_MAX_LENGTH = 2000;

export interface UseReservaStepperProps {
    espaco: Espaco;
    formData: ReservaFormData;
    slotsSelecao: SlotCalendario[];
    isEditMode?: boolean;
    setSlotsSelecao?: (slots: SlotCalendario[]) => void;
    initialStep?: ReservaStepId;
}

function dataValida(data: Date | null | undefined): data is Date {
    return data instanceof Date && !Number.isNaN(data.getTime());
}

export function useReservaStepper({
    espaco,
    formData,
    slotsSelecao,
    isEditMode = false,
    setSlotsSelecao,
    initialStep = 'detalhes',
}: UseReservaStepperProps) {
    const { t } = useTranslation();
    const [currentStepId, setCurrentStepId] = useState<ReservaStepId>(initialStep);
    const [stepErrors, setStepErrors] = useState<ErrosEtapa>({});
    const [slotIdsRealtime, setSlotIdsRealtime] = useState<ReadonlySet<string>>(() => new Set());

    const stepDefinitions = useMemo<Omit<StepperStep, 'isCompleted' | 'isValid'>[]>(
        () => [
            {
                id: 'detalhes',
                title: t('reservas.stepper.step1_title'),
                description: t('reservas.stepper.step1_desc'),
                iconName: 'file-text',
            },
            {
                id: 'revisao',
                title: t('reservas.stepper.step2_title'),
                description: t('reservas.stepper.step2_desc'),
                iconName: 'check-circle-2',
            },
        ],
        [t],
    );

    const errosDetalhes = useMemo<ErrosEtapa>(() => {
        const erros: ErrosEtapa = {};

        if (slotsSelecao.length === 0) {
            erros.slots = t('reservas.stepper.errors.select_slot');
        }
        if (!dataValida(formData.data_inicial)) {
            erros.data_inicial = t('reservas.stepper.errors.start_date_required');
        }
        if (!dataValida(formData.data_final)) {
            erros.data_final = t('reservas.stepper.errors.end_date_required');
        } else if (dataValida(formData.data_inicial) && startOfDay(formData.data_final) < startOfDay(formData.data_inicial)) {
            erros.data_final = t('reservas.stepper.errors.end_before_start');
        }
        if (!formData.titulo.trim()) {
            erros.titulo = t('reservas.stepper.errors.title_required');
        } else if (formData.titulo.length > TITULO_MAX_LENGTH) {
            erros.titulo = t('reservas.stepper.errors.title_max', { max: TITULO_MAX_LENGTH });
        }
        if (formData.descricao.length > DESCRICAO_MAX_LENGTH) {
            erros.descricao = t('reservas.stepper.errors.description_max', { max: DESCRICAO_MAX_LENGTH });
        }
        if (!publicoEstimadoValido(formData.publico_estimado)) {
            erros.publico_estimado = t('reservas.stepper.errors.public_invalid');
        }

        return erros;
    }, [slotsSelecao.length, formData.data_inicial, formData.data_final, formData.titulo, formData.descricao, formData.publico_estimado, t]);

    const recorrenciaGravada = recorrenciaParaGravar(formData.recorrencia, isEditMode && formData.edit_scope === EscopoRecorrencia.SINGLE);

    const linhasSolicitadas = useMemo(() => {
        if (formData.horarios_solicitados.length > 0) {
            return formData.horarios_solicitados;
        }

        return slotsSelecao.map((slot) => ({
            data: format(slot.data, 'yyyy-MM-dd'),
            horario_inicio: slot.horario_inicio,
            horario_fim: slot.horario_fim,
            agenda_id: slot.agenda_id,
        }));
    }, [formData.horarios_solicitados, slotsSelecao]);

    const horariosExpandidos = useMemo(
        () => expandirHorariosRecorrencia(linhasSolicitadas, recorrenciaGravada, formData.data_final),
        [linhasSolicitadas, recorrenciaGravada, formData.data_final],
    );

    const conflictingDates = useMemo(() => datasEmConflito(horariosExpandidos, espaco.agendas), [horariosExpandidos, espaco.agendas]);

    const slotIdsEstaticos = useMemo(
        () =>
            slotsEmConflito({
                slots: slotsSelecao,
                agendas: espaco.agendas,
                recorrencia: recorrenciaGravada,
                dataFinal: formData.data_final,
            }),
        [slotsSelecao, espaco.agendas, recorrenciaGravada, formData.data_final],
    );

    const conflictingSlotIds = useMemo(() => {
        const idsEmConflito = new Set([...slotIdsEstaticos, ...slotIdsRealtime]);

        return slotsSelecao.map((slot) => slot.id).filter((id) => idsEmConflito.has(id));
    }, [slotsSelecao, slotIdsEstaticos, slotIdsRealtime]);

    const hasAnyConflict = conflictingDates.length > 0 || conflictingSlotIds.length > 0;

    const termoAceito = Boolean(formData.termo_responsabilidade);

    const bloqueios = useMemo(
        () => ({
            detalhes: Object.keys(errosDetalhes).length > 0,
            conflito: hasAnyConflict,
            termo: !termoAceito,
        }),
        [errosDetalhes, hasAnyConflict, termoAceito],
    );

    const canSubmit = !bloqueios.detalhes && !bloqueios.conflito && !bloqueios.termo;
    const canAdvance = slotsSelecao.length > 0;

    const currentStepIndex = useMemo(() => stepDefinitions.findIndex((s) => s.id === currentStepId), [stepDefinitions, currentStepId]);

    const steps: StepperStep[] = useMemo(() => {
        const validade: Record<ReservaStepId, boolean> = {
            detalhes: !bloqueios.detalhes,
            revisao: canSubmit,
        };

        return stepDefinitions.map((stepDef, idx) => {
            const isValid = validade[stepDef.id];
            const isCompleted = idx < currentStepIndex && isValid;

            return { ...stepDef, isValid, isCompleted };
        });
    }, [stepDefinitions, bloqueios.detalhes, canSubmit, currentStepIndex]);

    const isFirstStep = currentStepIndex === 0;
    const isLastStep = currentStepIndex === stepDefinitions.length - 1;

    const prevStep = useCallback(() => {
        setCurrentStepId('detalhes');
        setStepErrors({});
    }, []);

    const errosAoVivo = useMemo<ErrosEtapa>(() => {
        if (currentStepId !== 'detalhes') {
            return {};
        }

        const erros: ErrosEtapa = {};
        if (formData.titulo.length > TITULO_MAX_LENGTH) {
            erros.titulo = t('reservas.stepper.errors.title_max', { max: TITULO_MAX_LENGTH });
        }
        if (formData.descricao.length > DESCRICAO_MAX_LENGTH) {
            erros.descricao = t('reservas.stepper.errors.description_max', { max: DESCRICAO_MAX_LENGTH });
        }
        if (!publicoEstimadoValido(formData.publico_estimado)) {
            erros.publico_estimado = t('reservas.stepper.errors.public_invalid');
        }

        return erros;
    }, [currentStepId, formData.titulo, formData.descricao, formData.publico_estimado, t]);

    const mergedStepErrors = useMemo<ErrosEtapa>(() => {
        const base: ErrosEtapa = {};

        if (stepErrors.slots && errosDetalhes.slots) {
            base.slots = stepErrors.slots;
        }
        if (stepErrors.data_inicial && errosDetalhes.data_inicial) {
            base.data_inicial = stepErrors.data_inicial;
        }
        if (stepErrors.data_final && errosDetalhes.data_final) {
            base.data_final = stepErrors.data_final;
        }
        if (stepErrors.titulo && errosDetalhes.titulo) {
            base.titulo = stepErrors.titulo;
        }
        if (stepErrors.descricao && errosDetalhes.descricao) {
            base.descricao = stepErrors.descricao;
        }
        if (stepErrors.publico_estimado && errosDetalhes.publico_estimado) {
            base.publico_estimado = stepErrors.publico_estimado;
        }

        return { ...base, ...errosAoVivo };
    }, [stepErrors, errosDetalhes, errosAoVivo]);

    const nextStep = useCallback((): boolean => {
        if (currentStepId !== 'detalhes') {
            return false;
        }

        if (Object.keys(errosDetalhes).length > 0) {
            setStepErrors(errosDetalhes);
            return false;
        }

        setCurrentStepId('revisao');
        setStepErrors({});
        return true;
    }, [currentStepId, errosDetalhes]);

    const goToStep = useCallback(
        (stepId: ReservaStepId) => {
            if (stepId === 'detalhes') {
                prevStep();
            } else {
                nextStep();
            }
        },
        [nextStep, prevStep],
    );

    const removerSlotsEmConflito = useCallback(() => {
        if (!setSlotsSelecao || conflictingSlotIds.length === 0) {
            return;
        }

        const remover = new Set(conflictingSlotIds);
        setSlotsSelecao(slotsSelecao.filter((slot) => !remover.has(slot.id)));
        setSlotIdsRealtime((anteriores) => new Set([...anteriores].filter((id) => !remover.has(id))));
    }, [setSlotsSelecao, conflictingSlotIds, slotsSelecao]);

    const onRealtimeSlotsConflict = useCallback((ids: string[]) => {
        if (ids.length === 0) {
            return;
        }

        setSlotIdsRealtime((anteriores) => new Set([...anteriores, ...ids]));
    }, []);

    const resetStepper = useCallback(() => {
        setCurrentStepId('detalhes');
        setStepErrors({});
        setSlotIdsRealtime(new Set());
    }, []);

    return {
        currentStepId,
        currentStepIndex,
        steps,
        isFirstStep,
        isLastStep,
        canAdvance,
        canSubmit,
        bloqueios,
        stepErrors: mergedStepErrors,
        conflictingDates,
        conflictingSlotIds,
        hasAnyConflict,
        goToStep,
        nextStep,
        prevStep,
        resetStepper,
        removerSlotsEmConflito,
        onRealtimeSlotsConflict,
    };
}

export default useReservaStepper;
