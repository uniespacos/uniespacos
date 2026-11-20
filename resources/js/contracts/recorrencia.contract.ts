export const RecorrenciaReserva = {
    UNICA: 'unica',
    QUINZE_DIAS: '15dias',
    UM_MES: '1mes',
    PERSONALIZADO: 'personalizado',
} as const;

export type RecorrenciaReservaType = (typeof RecorrenciaReserva)[keyof typeof RecorrenciaReserva];

export const OPCOES_RECORRENCIA_VALORES: readonly RecorrenciaReservaType[] = [
    RecorrenciaReserva.UNICA,
    RecorrenciaReserva.QUINZE_DIAS,
    RecorrenciaReserva.UM_MES,
    RecorrenciaReserva.PERSONALIZADO,
] as const;

export const EscopoRecorrencia = {
    SINGLE: 'single',
    RECURRING: 'recurring',
} as const;

export type EscopoRecorrenciaType = (typeof EscopoRecorrencia)[keyof typeof EscopoRecorrencia];

export const ESCOPOS_RECORRENCIA: readonly EscopoRecorrenciaType[] = [
    EscopoRecorrencia.SINGLE,
    EscopoRecorrencia.RECURRING,
] as const;

export function isEscopoRecorrencia(valor: unknown): valor is EscopoRecorrenciaType {
    return valor === EscopoRecorrencia.SINGLE || valor === EscopoRecorrencia.RECURRING;
}
