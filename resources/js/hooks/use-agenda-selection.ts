import { opcoesRecorrencia } from '@/constants/recorrencia';
import {
    EscopoRecorrencia,
    type EscopoRecorrenciaType,
    RecorrenciaReserva,
    type RecorrenciaReservaType,
    SituacaoReserva,
    type SituacaoReservaType,
} from '@/contracts';
import { useSlotSelection } from '@/hooks/use-slot-selection';
import { useTranslation } from '@/i18n';
import { parseDataLocal } from '@/lib/utils';
import { propagarEdicaoRecorrente } from '@/lib/utils/propagar-edicao-recorrente';
import { type Agenda, type Espaco, type Reserva, type SlotCalendario } from '@/types';
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
    publico_estimado?: number | string | null;
    categoria?: string | null;
    [key: string]: string | number | boolean | Date | null | undefined | AgendaHorarioPayload[];
}

interface UseAgendaSelectionProps {
    espaco: Espaco;
    reserva?: Reserva;
    isEditMode: boolean;
    semanaVisivel: Date;
    userId?: number;
}

export function resolverSituacaoInicialReserva(
    horariosSolicitados: AgendaHorarioPayload[],
    agendas: Agenda[] | undefined,
    userId: number | undefined,
): SituacaoReservaType {
    if (!userId || !agendas || agendas.length === 0 || horariosSolicitados.length === 0) {
        return SituacaoReserva.EM_ANALISE;
    }

    const agendaIdsUsadas = new Set(horariosSolicitados.map((h) => h.agenda_id).filter((id): id is number => typeof id === 'number'));
    const agendasUsadas = agendas.filter((agenda) => agendaIdsUsadas.has(agenda.id));

    if (agendasUsadas.length === 0) {
        return SituacaoReserva.EM_ANALISE;
    }

    const gestoresUnicos = new Set(agendasUsadas.map((a) => a.user?.id).filter((id): id is number => typeof id === 'number'));

    if (gestoresUnicos.size === 1 && gestoresUnicos.has(userId)) {
        return SituacaoReserva.DEFERIDA;
    }

    if (gestoresUnicos.has(userId)) {
        return SituacaoReserva.PARCIALMENTE_DEFERIDA;
    }

    return SituacaoReserva.EM_ANALISE;
}

export function useAgendaSelection({ espaco, reserva, isEditMode, semanaVisivel, userId }: UseAgendaSelectionProps) {
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

    const chavesIniciais = useMemo(() => new Set(slotsIniciais.map(chaveSlotAgenda)), [slotsIniciais]);

    const { slotsSelecao, alternarSelecaoSlot, alternarSelecaoIntervalo, definirSelecaoDeVarios, isSlotSelecionado, limparSelecao, setSlotsSelecao } =
        useSlotSelection({ hoje, slotsIniciais });

    const [dialogAbertoEstado, setDialogAbertoEstado] = useState(false);
    const [sucessoCriacao, setSucessoCriacao] = useState(false);
    const [situacaoCriacao, setSituacaoCriacao] = useState<SituacaoReservaType>(SituacaoReserva.EM_ANALISE);

    const setDialogAberto = useCallback((aberto: boolean) => {
        setSucessoCriacao(false);
        setSituacaoCriacao(SituacaoReserva.EM_ANALISE);
        setDialogAbertoEstado(aberto);
    }, []);

    const { data, setData, post, patch, processing, reset } = useForm<AgendaSelectionFormData>({
        titulo: reserva?.titulo ?? '',
        descricao: reserva?.descricao ?? '',
        publico_estimado: reserva?.publico_estimado ?? '',
        categoria: reserva?.categoria ?? '',
        data_inicial: reserva?.data_inicial ? parseDataLocal(reserva.data_inicial) : hoje,
        data_final: reserva?.data_final ? parseDataLocal(reserva.data_final) : addMonths(hoje, 1),
        recorrencia: reserva?.recorrencia ?? RecorrenciaReserva.UNICA,
        horarios_solicitados: [],
        edit_scope: EscopoRecorrencia.RECURRING,
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
            const situacaoPrevista = resolverSituacaoInicialReserva(data.horarios_solicitados, espaco.agendas, userId);
            post(route('reservas.store'), {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSituacaoCriacao(situacaoPrevista);
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
        situacaoCriacao,
        formData,
        setFormData,
        processing,
        handleFormSubmit,
    };
}
