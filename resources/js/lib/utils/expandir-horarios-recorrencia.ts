import { RecorrenciaReserva, type RecorrenciaReservaType } from '@/contracts/recorrencia.contract';
import { parseDataLocal } from '@/lib/utils';
import { addWeeks, format, getDay, isAfter, isBefore, isValid, startOfDay } from 'date-fns';

export interface HorarioRecorrenciaPayload {
    data: string;
    horario_inicio: string;
    horario_fim: string;
    agenda_id?: number | undefined;
}

export type HorarioRecorrenciaEntrada = Partial<HorarioRecorrenciaPayload>;

export type DataFinalRecorrencia = Date | string | null | undefined;

function deduplicar<T>(itens: readonly T[], chave: (item: T) => string): T[] {
    const vistos = new Set<string>();

    return itens.filter((item) => {
        const id = chave(item);
        if (vistos.has(id)) {
            return false;
        }
        vistos.add(id);
        return true;
    });
}

function chaveSlot(horario: HorarioRecorrenciaPayload): string {
    return `${String(horario.agenda_id ?? '')}|${horario.data}|${horario.horario_inicio}|${horario.horario_fim}`;
}

function chaveLinha(horario: HorarioRecorrenciaPayload): string {
    return `${String(horario.agenda_id ?? '')}|${horario.data}|${horario.horario_inicio}`;
}

function normalizarHorarios(horarios: readonly HorarioRecorrenciaEntrada[]): HorarioRecorrenciaPayload[] {
    return horarios.flatMap((horario) => {
        if (!horario.data || !horario.horario_inicio || !horario.horario_fim) {
            return [];
        }

        if (!isValid(parseDataLocal(horario.data))) {
            return [];
        }

        return [
            {
                data: horario.data,
                horario_inicio: horario.horario_inicio,
                horario_fim: horario.horario_fim,
                agenda_id: horario.agenda_id,
            },
        ];
    });
}

function proximaDataExplicita(origem: Date, horarios: readonly HorarioRecorrenciaPayload[]): Date | null {
    let proxima: Date | null = null;

    for (const horario of horarios) {
        const dia = startOfDay(parseDataLocal(horario.data));
        if (getDay(dia) === getDay(origem) && isAfter(dia, origem) && (proxima === null || isBefore(dia, proxima))) {
            proxima = dia;
        }
    }

    return proxima;
}

function expandirSemanalmente(
    slots: readonly HorarioRecorrenciaPayload[],
    horarios: readonly HorarioRecorrenciaPayload[],
    dataFinal: Date,
): HorarioRecorrenciaPayload[] {
    return slots.flatMap((slot) => {
        const dataInicial = startOfDay(parseDataLocal(slot.data));
        const proxima = proximaDataExplicita(dataInicial, horarios);
        const expandidos: HorarioRecorrenciaPayload[] = [];

        for (let cursor = dataInicial; !isAfter(cursor, dataFinal) && (proxima === null || isBefore(cursor, proxima)); cursor = addWeeks(cursor, 1)) {
            expandidos.push({
                data: format(cursor, 'yyyy-MM-dd'),
                horario_inicio: slot.horario_inicio,
                horario_fim: slot.horario_fim,
                agenda_id: slot.agenda_id,
            });
        }

        return expandidos;
    });
}

/**
 * Espelha `ExpansaoHorariosService` do backend: `unica` apenas deduplica; as demais
 * recorrencias repetem cada slot a cada 7 dias ate `dataFinal` (inclusive), parando
 * antes da proxima data explicita do mesmo dia da semana.
 */
export function expandirHorariosRecorrencia(
    horarios: readonly HorarioRecorrenciaEntrada[],
    recorrencia: RecorrenciaReservaType,
    dataFinal: DataFinalRecorrencia,
): HorarioRecorrenciaPayload[] {
    const validos = normalizarHorarios(horarios);
    const slotsUnicos = deduplicar(validos, chaveSlot);

    const dataFinalDia = dataFinal ? startOfDay(parseDataLocal(dataFinal)) : null;
    const semExpansao = recorrencia === RecorrenciaReserva.UNICA || dataFinalDia === null || !isValid(dataFinalDia);

    const linhas = semExpansao ? slotsUnicos : expandirSemanalmente(slotsUnicos, validos, dataFinalDia);

    return deduplicar(linhas, chaveLinha).sort((a, b) => a.data.localeCompare(b.data) || a.horario_inicio.localeCompare(b.horario_inicio));
}
