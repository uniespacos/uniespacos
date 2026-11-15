import { opcoesRecorrencia } from '@/constants/recorrencia';
import { useSlotSelection } from '@/hooks/use-slot-selection';
import { parseDataLocal } from '@/lib/utils';
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
    [key: string]: string | number | { id: number; turno: string } | undefined;
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

    const { slotsSelecao, alternarSelecaoSlot, isSlotSelecionado, limparSelecao, setSlotsSelecao } = useSlotSelection({ hoje, slotsIniciais });

    const [dialogAberto, setDialogAberto] = useState(false);

    const { data, setData, post, patch, processing, reset } = useForm<AgendaSelectionFormData>({
        titulo: reserva?.titulo ?? '',
        descricao: reserva?.descricao ?? '',
        data_inicial: reserva?.data_inicial ? parseDataLocal(reserva.data_inicial) : hoje,
        data_final: reserva?.data_final ? parseDataLocal(reserva.data_final) : addMonths(hoje, 1),
        recorrencia: reserva?.recorrencia ?? 'unica',
        horarios_solicitados: [],
        edit_scope: 'recurring',
        edited_week_date: semanaVisivelIso,
    });

    useEffect(() => {
        setData((prevData) => (prevData.edited_week_date === semanaVisivelIso ? prevData : { ...prevData, edited_week_date: semanaVisivelIso }));
    }, [semanaVisivelIso, setData]);

    useEffect(() => {
        const horariosParaEnviar: AgendaHorarioPayload[] = slotsSelecao.map((s) => ({
            data: format(s.data, 'yyyy-MM-dd'),
            horario_inicio: s.horario_inicio,
            horario_fim: s.horario_fim,
            agenda_id: s.agenda_id,
        }));

        setData((prevData) => {
            if (slotsSelecao.length === 0) {
                return {
                    ...prevData,
                    horarios_solicitados: horariosParaEnviar,
                };
            }

            const timestamps = slotsSelecao.map((s) => s.data.getTime());
            const novaDataInicial = new Date(Math.min(...timestamps));
            const maiorData = new Date(Math.max(...timestamps));

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
                horarios_solicitados: horariosParaEnviar,
                data_inicial: novaDataInicial,
                data_final: novaDataFinal,
            };
        });
    }, [slotsSelecao, setData]);

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
                toast.error(Object.values(formErrors)[0] || 'Ocorreu um erro de validação.');
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
