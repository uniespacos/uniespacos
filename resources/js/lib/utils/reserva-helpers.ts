import { Reserva, SituacaoReserva } from '@/types';

export function calculateGestorStatus(reserva: Reserva): SituacaoReserva {
    const horarios = reserva.horarios;

    if (horarios.length === 0) {
        return reserva.situacao;
    }

    const situacoes = horarios.map((h) => h.situacao);

    if (situacoes.includes('em_analise')) {
        return 'em_analise';
    }

    if (situacoes.every((s) => s === 'deferida')) {
        return 'deferida';
    }

    if (situacoes.every((s) => s === 'indeferida')) {
        return 'indeferida';
    }

    return 'parcialmente_deferida';
}

export function comSituacaoEfetivaDoGestor(reservas: Reserva[]): Reserva[] {
    return reservas.map((reserva) => ({
        ...reserva,
        situacao: calculateGestorStatus(reserva),
    }));
}
