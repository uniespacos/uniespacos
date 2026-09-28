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
