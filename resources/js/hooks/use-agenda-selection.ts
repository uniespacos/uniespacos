import { opcoesRecorrencia } from '@/constants/recorrencia';
import { EscopoRecorrencia, type EscopoRecorrenciaType, RecorrenciaReserva, type RecorrenciaReservaType } from '@/contracts';
import { useSlotSelection } from '@/hooks/use-slot-selection';
import { parseDataLocal } from '@/lib/utils';
import { propagarEdicaoRecorrente } from '@/lib/utils/propagar-edicao-recorrente';
import { type Espaco, type Reserva, type SlotCalendario } from '@/types';
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

function chaveSlotAgenda(slot: SlotCalendario): string {
    return `${String(slot.agenda_id ?? '')}|${format(slot.data, 'yyyy-MM-dd')}|${slot.horario_inicio}`;
}

interface CalcularNovaDataFinalParams {
    recorrencia: RecorrenciaReservaType;
    dataInicial: Date;
    dataFinalAtual: Date | null;
    slotsSelecao: SlotCalendario[];
    chavesIniciais: Set<string>;
    isEditMode: boolean;
    editScope?: EscopoRecorrenciaType;
}

function calcularNovaDataFinal({
    recorrencia,
    dataInicial,
    dataFinalAtual,
    slotsSelecao,
    chavesIniciais,
    isEditMode,
    editScope,
}: CalcularNovaDataFinalParams): Date | null {
    const maiorDataTodos = new Date(Math.max(...slotsSelecao.map((s) => s.data.getTime())));

    if (recorrencia === RecorrenciaReserva.PERSONALIZADO) {
        const limiteMinimo = isBefore(startOfDay(dataInicial), startOfDay(maiorDataTodos)) ? maiorDataTodos : dataInicial;
        if (!dataFinalAtual || isBefore(startOfDay(dataFinalAtual), startOfDay(limiteMinimo))) {
            return limiteMinimo;
        }
        return dataFinalAtual;
    }

    if (recorrencia === RecorrenciaReserva.UNICA) {
        return maiorDataTodos;
    }

    const opcaoRecorrencia = opcoesRecorrencia.find((op) => op.valor === recorrencia);
    if (!opcaoRecorrencia) {
        return dataFinalAtual;
    }

    const calculada = opcaoRecorrencia.calcularDataFinal(dataInicial);

    if (isEditMode && editScope === EscopoRecorrencia.RECURRING) {
        const slotsAdicionados = slotsSelecao.filter((slot) => !chavesIniciais.has(chaveSlotAgenda(slot)));
        if (slotsAdicionados.length === 0) {
            return calculada;
        }
        const maiorDataAdicionada = new Date(Math.max(...slotsAdicionados.map((s) => s.data.getTime())));
        return isBefore(startOfDay(calculada), startOfDay(maiorDataAdicionada)) ? maiorDataAdicionada : calculada;
    }

    return isBefore(startOfDay(calculada), startOfDay(maiorDataTodos)) ? maiorDataTodos : calculada;
}

interface AgendaSelectionFormData {
    titulo: string;
    descricao: string;
    data_inicial: Date | null;
    data_final: Date | null;
    recorrencia: RecorrenciaReservaType;
    horarios_solicitados: AgendaHorarioPayload[];
    edit_scope?: EscopoRecorrenciaType;
    edited_week_date?: string;
    termo_responsabilidade?: boolean;
    publico_estimado?: number | string;
    categoria?: string;
    [key: string]: string | number | boolean | Date | null | undefined | AgendaHorarioPayload[];
}

interface UseAgendaSelectionProps {
    espaco: Espaco;
    reserva?: Reserva;
    isEditMode: boolean;
    semanaVisivel: Date;
}

export function useAgendaSelection({ reserva, isEditMode, semanaVisivel }: UseAgendaSelectionProps) {
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

    const chavesIniciais = useMemo(() => new Set(slotsIniciais.map(chaveSlotAgenda)), [slotsIniciais]);

    const { slotsSelecao, alternarSelecaoSlot, isSlotSelecionado, limparSelecao, setSlotsSelecao } = useSlotSelection({ hoje, slotsIniciais });

    const [dialogAberto, setDialogAberto] = useState(false);

    const { data, setData, post, patch, processing, reset } = useForm<AgendaSelectionFormData>({
        titulo: reserva?.titulo ?? '',
        descricao: reserva?.descricao ?? '',
        data_inicial: reserva?.data_inicial ? parseDataLocal(reserva.data_inicial) : hoje,
        data_final: reserva?.data_final ? parseDataLocal(reserva.data_final) : addMonths(hoje, 1),
        recorrencia: reserva?.recorrencia ?? RecorrenciaReserva.UNICA,
        horarios_solicitados: [],
        edit_scope: EscopoRecorrencia.RECURRING,
        edited_week_date: semanaVisivelIso,
    });

    useEffect(() => {
        setData((prevData) => (prevData.edited_week_date === semanaVisivelIso ? prevData : { ...prevData, edited_week_date: semanaVisivelIso }));
    }, [semanaVisivelIso, setData]);

    useEffect(() => {
        if (slotsSelecao.length === 0) return;

        const timestamps = slotsSelecao.map((s) => s.data.getTime());
        const novaDataInicial = new Date(Math.min(...timestamps));

        setData((prevData) => {
            const novaDataFinal = calcularNovaDataFinal({
                recorrencia: prevData.recorrencia,
                dataInicial: novaDataInicial,
                dataFinalAtual: prevData.data_final,
                slotsSelecao,
                chavesIniciais,
                isEditMode,
                editScope: prevData.edit_scope,
            });

            return {
                ...prevData,
                data_inicial: novaDataInicial,
                data_final: novaDataFinal,
            };
        });
    }, [slotsSelecao, chavesIniciais, isEditMode, setData]);

    const { edit_scope, recorrencia, data_inicial, data_final } = data;

    const horariosSolicitados = useMemo<AgendaHorarioPayload[]>(() => {
        const atuais = slotsSelecao.map(paraPayloadHorario);
        const propagarEdicao =
            isEditMode &&
            edit_scope === EscopoRecorrencia.RECURRING &&
            recorrencia !== RecorrenciaReserva.UNICA &&
            data_inicial !== null &&
            data_final !== null;

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

        setData((prevData) => {
            const dataIni = prevData.data_inicial ?? new Date();
            const novaDataFinal = calcularNovaDataFinal({
                recorrencia: prevData.recorrencia,
                dataInicial: dataIni,
                dataFinalAtual: prevData.data_final,
                slotsSelecao,
                chavesIniciais,
                isEditMode,
                editScope: prevData.edit_scope,
            });

            if (prevData.data_final?.getTime() === novaDataFinal?.getTime()) {
                return prevData;
            }

            return { ...prevData, data_final: novaDataFinal };
        });
    }, [data.recorrencia, data.data_inicial, data.edit_scope, isEditMode, chavesIniciais, slotsSelecao, setData]);

    const handleFormSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        if (data.horarios_solicitados.length === 0) {
            toast.error('Selecione pelo menos um horário para reservar.');
            return;
        }

        const options = {
            onSuccess: () => {
                limparSelecao();
                setDialogAberto(false);
                reset();
                toast.success(isEditMode ? 'Sua solicitação de alteração foi enviada!' : 'Solicitação de reserva enviada com sucesso!');
            },
            onError: (formErrors: Record<string, string>) => {
                toast.error(Object.values(formErrors)[0] || 'Ocorreu um erro de validação.', { duration: 8000 });
            },
        };

        if (isEditMode) {
            patch(route('reservas.update', { reserva: reserva?.id }), options);
        } else {
            post(route('reservas.store'), { ...options, preserveScroll: true, preserveState: true });
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
        isSlotSelecionado,
        limparSelecao,
        setSlotsSelecao,
        dialogAberto,
        setDialogAberto,
        formData,
        setFormData,
        processing,
        handleFormSubmit,
    };
}
