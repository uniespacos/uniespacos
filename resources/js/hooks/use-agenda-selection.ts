import { opcoesRecorrencia } from '@/constants/recorrencia';
import { useSlotSelection } from '@/hooks/use-slot-selection';
import { useTranslation } from '@/i18n';
import { parseDataLocal } from '@/lib/utils';
import { propagarEdicaoRecorrente } from '@/lib/utils/propagar-edicao-recorrente';
import { type Espaco, type Reserva, type SlotCalendario, type ValorOcorrenciaType } from '@/types';
import { type ReservaFormData } from '@/types/reserva-stepper';
import { useForm } from '@inertiajs/react';
import { addMonths, format, isBefore, parse, startOfDay } from 'date-fns';
import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

declare function route(name: string, params?: unknown): string;

interface AgendaHorarioPayload {
    data: string;
    horario_inicio: string;
    horario_fim: string;
    agenda_id?: number;
}

function paraPayloadHorario(slot: SlotCalendario): AgendaHorarioPayload {
    return {
        data: format(slot.data, 'yyyy-MM-dd'),
        horario_inicio: slot.horario_inicio,
        horario_fim: slot.horario_fim,
        agenda_id: slot.agenda_id,
    };
}

interface AgendaSelectionFormData {
    titulo: string;
    descricao: string;
    data_inicial: Date | null;
    data_final: Date | null;
    recorrencia: ValorOcorrenciaType;
    horarios_solicitados: AgendaHorarioPayload[];
    edit_scope?: 'single' | 'recurring';
    edited_week_date?: string;
    termo_responsabilidade?: boolean;
    publico_estimado?: number | string | null;
    categoria?: string | null;
    [key: string]: string | number | boolean | Date | null | undefined | AgendaHorarioPayload[];
}

interface UseAgendaSelectionProps {
    espaco: Espaco;
    reserva?: Reserva;
    isEditMode: boolean;
    semanaVisivel: Date;
}

export function useAgendaSelection({ reserva, isEditMode, semanaVisivel }: UseAgendaSelectionProps) {
    const { t } = useTranslation();
    const hoje = useMemo(() => new Date(new Date().setHours(0, 0, 0, 0)), []);
    const semanaVisivelIso = format(semanaVisivel, 'yyyy-MM-dd');

    const slotsIniciais = useMemo<SlotCalendario[]>(() => {
        if (!reserva?.horarios) {
            return [];
        }
        return reserva.horarios.map((horario) => ({
            id: `${horario.data}|${horario.horario_inicio}`,
            status: 'selecionado',
            data: parse(horario.data, 'yyyy-MM-dd', new Date()),
            horario_inicio: horario.horario_inicio,
            horario_fim: horario.horario_fim,
            agenda_id: horario.agenda?.id,
            dadosReserva: {
                horarioDB: horario,
                autor: reserva.user?.name ?? 'Indefinido',
                reserva_titulo: reserva.titulo,
            },
        }));
    }, [reserva]);

    const { slotsSelecao, alternarSelecaoSlot, alternarSelecaoIntervalo, definirSelecaoDeVarios, isSlotSelecionado, limparSelecao, setSlotsSelecao } =
        useSlotSelection({ hoje, slotsIniciais });

    const [dialogAbertoEstado, setDialogAbertoEstado] = useState(false);
    const [sucessoCriacao, setSucessoCriacao] = useState(false);

    const setDialogAberto = useCallback((aberto: boolean) => {
        setSucessoCriacao(false);
        setDialogAbertoEstado(aberto);
    }, []);

    const { data, setData, post, patch, processing, reset } = useForm<AgendaSelectionFormData>({
        titulo: reserva?.titulo ?? '',
        descricao: reserva?.descricao ?? '',
        publico_estimado: reserva?.publico_estimado ?? '',
        categoria: reserva?.categoria ?? '',
        data_inicial: reserva?.data_inicial ? parseDataLocal(reserva.data_inicial) : hoje,
        data_final: reserva?.data_final ? parseDataLocal(reserva.data_final) : addMonths(hoje, 1),
        recorrencia: reserva?.recorrencia ?? 'unica',
        horarios_solicitados: [],
        edit_scope: 'recurring',
        edited_week_date: semanaVisivelIso,
        termo_responsabilidade: false,
    });

    useEffect(() => {
        setData((prevData) => (prevData.edited_week_date === semanaVisivelIso ? prevData : { ...prevData, edited_week_date: semanaVisivelIso }));
    }, [semanaVisivelIso, setData]);

    useEffect(() => {
        if (slotsSelecao.length === 0) return;

        const timestamps = slotsSelecao.map((s) => s.data.getTime());
        const novaDataInicial = new Date(Math.min(...timestamps));
        const maiorData = new Date(Math.max(...timestamps));

        setData((prevData) => {
            let novaDataFinal = prevData.data_final;
            if (prevData.recorrencia === 'personalizado') {
                const limiteMinimo = isBefore(startOfDay(novaDataInicial), startOfDay(maiorData)) ? maiorData : novaDataInicial;
                if (!novaDataFinal || isBefore(startOfDay(novaDataFinal), startOfDay(limiteMinimo))) {
                    novaDataFinal = limiteMinimo;
                }
            } else {
                const opcaoRecorrencia = opcoesRecorrencia.find((op) => op.valor === prevData.recorrencia);
                if (opcaoRecorrencia) {
                    const calculada = prevData.recorrencia === 'unica' ? maiorData : opcaoRecorrencia.calcularDataFinal(novaDataInicial);
                    novaDataFinal = isBefore(startOfDay(calculada), startOfDay(maiorData)) ? maiorData : calculada;
                }
            }

            return {
                ...prevData,
                data_inicial: novaDataInicial,
                data_final: novaDataFinal,
            };
        });
    }, [slotsSelecao, setData]);

    const { edit_scope, recorrencia, data_inicial, data_final } = data;

    const horariosSolicitados = useMemo<AgendaHorarioPayload[]>(() => {
        const atuais = slotsSelecao.map(paraPayloadHorario);
        const propagarEdicao = isEditMode && edit_scope === 'recurring' && recorrencia !== 'unica' && data_inicial !== null && data_final !== null;

        if (!propagarEdicao) {
            return atuais;
        }

        return propagarEdicaoRecorrente({
            iniciais: slotsIniciais.map(paraPayloadHorario),
            atuais,
            dataInicial: data_inicial,
            dataFinal: data_final,
            hoje,
        });
    }, [slotsSelecao, slotsIniciais, isEditMode, edit_scope, recorrencia, data_inicial, data_final, hoje]);

    useEffect(() => {
        setData((prevData) => ({ ...prevData, horarios_solicitados: horariosSolicitados }));
    }, [horariosSolicitados, setData]);

    useEffect(() => {
        if (slotsSelecao.length === 0) return;

        const maiorData = new Date(Math.max(...slotsSelecao.map((s) => s.data.getTime())));

        setData((prevData) => {
            const dataIni = prevData.data_inicial ?? new Date();

            if (prevData.recorrencia === 'personalizado') {
                const limiteMinimo = isBefore(startOfDay(dataIni), startOfDay(maiorData)) ? maiorData : dataIni;
                if (!prevData.data_final || isBefore(startOfDay(prevData.data_final), startOfDay(limiteMinimo))) {
                    return { ...prevData, data_final: limiteMinimo };
                }
                return prevData;
            }

            const opcaoRecorrencia = opcoesRecorrencia.find((op) => op.valor === prevData.recorrencia);
            if (!opcaoRecorrencia) return prevData;

            const calculada = prevData.recorrencia === 'unica' ? maiorData : opcaoRecorrencia.calcularDataFinal(dataIni);
            const novaDataFinal = isBefore(startOfDay(calculada), startOfDay(maiorData)) ? maiorData : calculada;

            if (prevData.data_final?.getTime() === novaDataFinal.getTime()) {
                return prevData;
            }

            return { ...prevData, data_final: novaDataFinal };
        });
    }, [data.recorrencia, data.data_inicial, slotsSelecao, setData]);

    const handleFormSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        if (data.horarios_solicitados.length === 0) {
            toast.error(t('reservas.stepper.errors.select_slot_toast'));
            return;
        }

        const onError = (formErrors: Record<string, string>) => {
            toast.error(Object.values(formErrors)[0] || t('reservas.stepper.errors.generic_validation'), { duration: 8000 });
        };

        if (isEditMode) {
            patch(route('reservas.update', { reserva: reserva?.id }), {
                onSuccess: () => {
                    limparSelecao();
                    setDialogAberto(false);
                    reset();
                    toast.success(t('reservas.stepper.success_updated'));
                },
                onError,
            });
        } else {
            post(route('reservas.store'), {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    limparSelecao();
                    reset();
                    setSucessoCriacao(true);
                },
                onError,
            });
        }
    };

    const setFormData = useCallback(
        (key: keyof ReservaFormData, value: unknown) => {
            setData((prevData) => ({
                ...prevData,
                [key]: value as AgendaSelectionFormData[keyof AgendaSelectionFormData],
            }));
        },
        [setData],
    );

    const formData: ReservaFormData = data;

    return {
        slotsSelecao,
        alternarSelecaoSlot,
        alternarSelecaoIntervalo,
        definirSelecaoDeVarios,
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
        dialogAberto: dialogAbertoEstado,
        setDialogAberto,
        sucessoCriacao,
        formData,
        setFormData,
        processing,
        handleFormSubmit,
    };
}
