import { SituacaoHorario, SituacaoReserva, type SituacaoReservaType } from '@/contracts';
import { type Reserva } from '@/types';

export function calculateGestorStatus(reserva: Reserva): SituacaoReservaType {
    if (reserva.situacao === SituacaoReserva.INATIVA) {
        return SituacaoReserva.INATIVA;
    }

    const horarios = reserva.horarios;

    if (horarios.length === 0) {
        return reserva.situacao;
    }

    const situacoes = horarios.map((h) => h.situacao);

    if (situacoes.every((s) => s === SituacaoHorario.INATIVA)) {
        return SituacaoReserva.INATIVA;
    }

    if (situacoes.includes(SituacaoHorario.EM_ANALISE)) {
        return SituacaoReserva.EM_ANALISE;
    }

    if (situacoes.every((s) => s === SituacaoHorario.DEFERIDA)) {
        return SituacaoReserva.DEFERIDA;
    }

    if (situacoes.every((s) => s === SituacaoHorario.INDEFERIDA)) {
        return SituacaoReserva.INDEFERIDA;
    }

    return SituacaoReserva.PARCIALMENTE_DEFERIDA;
}

export function comSituacaoEfetivaDoGestor(reservas: Reserva[]): Reserva[] {
    return reservas.map((reserva) => ({
        ...reserva,
        situacao: calculateGestorStatus(reserva),
    }));
}
