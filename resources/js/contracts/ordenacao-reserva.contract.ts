export const OrdenacaoReserva = {
    DATA_SOLICITACAO: 'data_solicitacao',
    SITUACAO: 'situacao',
} as const;

export type OrdenacaoReservaType = (typeof OrdenacaoReserva)[keyof typeof OrdenacaoReserva];

export const ORDENACAO_RESERVA_DEFAULT: OrdenacaoReservaType = OrdenacaoReserva.DATA_SOLICITACAO;
