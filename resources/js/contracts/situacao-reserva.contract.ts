export const SituacaoReserva = {
    EM_ANALISE: 'em_analise',
    INDEFERIDA: 'indeferida',
    PARCIALMENTE_DEFERIDA: 'parcialmente_deferida',
    DEFERIDA: 'deferida',
    INATIVA: 'inativa',
} as const;

export type SituacaoReservaType = (typeof SituacaoReserva)[keyof typeof SituacaoReserva];

export const SituacaoHorario = {
    EM_ANALISE: SituacaoReserva.EM_ANALISE,
    INDEFERIDA: SituacaoReserva.INDEFERIDA,
    DEFERIDA: SituacaoReserva.DEFERIDA,
    INATIVA: SituacaoReserva.INATIVA,
} as const;

export type SituacaoHorarioType = (typeof SituacaoHorario)[keyof typeof SituacaoHorario];

export const SITUACOES_DE_AVALIACAO: readonly SituacaoReservaType[] = [
    SituacaoReserva.EM_ANALISE,
    SituacaoReserva.PARCIALMENTE_DEFERIDA,
    SituacaoReserva.DEFERIDA,
    SituacaoReserva.INDEFERIDA,
] as const;
