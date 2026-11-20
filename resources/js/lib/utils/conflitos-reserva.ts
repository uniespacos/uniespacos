import { RecorrenciaReserva, type RecorrenciaReservaType } from '@/contracts/recorrencia.contract';
import { SituacaoHorario } from '@/contracts/situacao-reserva.contract';
import { expandirHorariosRecorrencia } from '@/lib/utils/expandir-horarios-recorrencia';
import { Agenda, Horario, SlotCalendario } from '@/types';
import { format, isValid, parseISO } from 'date-fns';

export interface LinhaSolicitada {
    data?: string;
    horario_inicio?: string;
    horario_fim?: string;
    agenda_id?: number;
    agenda?: { id?: number } | null;
}

interface IntervaloHorario {
    data: string;
    horario_inicio: string;
    horario_fim: string;
}

export function agendaIdDaLinha(linha: LinhaSolicitada): number | undefined {
    return typeof linha.agenda_id === 'number' ? linha.agenda_id : linha.agenda?.id;
}

function horariosDeferidosDaAgenda(agendas: readonly Agenda[] | undefined, agendaId: number | undefined): Horario[] {
    if (agendaId === undefined) {
        return [];
    }

    return (agendas ?? [])
        .filter((agenda) => agenda.id === agendaId)
        .flatMap((agenda) => agenda.horarios ?? [])
        .filter((horario) => horario.situacao === SituacaoHorario.DEFERIDA);
}

function sobrepoe(intervalo: IntervaloHorario, horario: Horario): boolean {
    return horario.data === intervalo.data && horario.horario_inicio < intervalo.horario_fim && horario.horario_fim > intervalo.horario_inicio;
}

function dataLegivel(data: string): string {
    const convertida = parseISO(data);

    return isValid(convertida) ? format(convertida, 'dd/MM/yyyy') : data;
}

export function datasEmConflito(linhas: readonly LinhaSolicitada[], agendas: readonly Agenda[] | undefined): string[] {
    const datas = new Set<string>();

    linhas.forEach((linha) => {
        if (!linha.data || !linha.horario_inicio || !linha.horario_fim) {
            return;
        }

        const intervalo: IntervaloHorario = { data: linha.data, horario_inicio: linha.horario_inicio, horario_fim: linha.horario_fim };
        const ocupados = horariosDeferidosDaAgenda(agendas, agendaIdDaLinha(linha));

        if (ocupados.some((horario) => sobrepoe(intervalo, horario))) {
            datas.add(dataLegivel(linha.data));
        }
    });

    return [...datas];
}

export function recorrenciaParaGravar(recorrencia: RecorrenciaReservaType, edicaoSemanaUnica: boolean): RecorrenciaReservaType {
    return edicaoSemanaUnica ? RecorrenciaReserva.UNICA : recorrencia;
}

interface SlotsEmConflitoParams {
    slots: readonly SlotCalendario[];
    agendas: readonly Agenda[] | undefined;
    recorrencia: RecorrenciaReservaType;
    dataFinal: Date | null | undefined;
}

/**
 * Ids dos slots da seleção cuja expansão (conforme a recorrência gravada) colide com
 * horário já deferido da mesma agenda. Cada slot é expandido isoladamente, para que o
 * conflito de uma ocorrência futura também leve à remoção do slot de origem.
 */
export function slotsEmConflito({ slots, agendas, recorrencia, dataFinal }: SlotsEmConflitoParams): string[] {
    return slots
        .filter((slot) => {
            const ocupados = horariosDeferidosDaAgenda(agendas, slot.agenda_id);

            if (ocupados.length === 0) {
                return false;
            }

            const linhas = expandirHorariosRecorrencia(
                [
                    {
                        data: format(slot.data, 'yyyy-MM-dd'),
                        horario_inicio: slot.horario_inicio,
                        horario_fim: slot.horario_fim,
                        agenda_id: slot.agenda_id,
                    },
                ],
                recorrencia,
                dataFinal,
            );

            return linhas.some((linha) => ocupados.some((horario) => sobrepoe(linha, horario)));
        })
        .map((slot) => slot.id);
}
