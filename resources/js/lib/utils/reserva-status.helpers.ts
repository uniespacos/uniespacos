import { SituacaoHorario, SituacaoReserva, type SituacaoHorarioType, type SituacaoReservaType } from '@/contracts';
import { assertNever } from '@/lib/utils/exhaustive';
import { type SlotCalendario } from '@/types';

export function mapearStatusBackendParaSlot(status: SituacaoHorarioType): SlotCalendario['status'] {
    switch (status) {
        case SituacaoHorario.EM_ANALISE:
            return 'solicitado';
        case SituacaoHorario.DEFERIDA:
            return SituacaoReserva.DEFERIDA;
        case SituacaoHorario.INDEFERIDA:
            return SituacaoReserva.INDEFERIDA;
        case SituacaoHorario.INATIVA:
            return 'reservado';
        default:
            return assertNever(status);
    }
}

export function verificarStatusReserva(slots: SlotCalendario[]): SituacaoReservaType {
    if (slots.length === 0) {
        return SituacaoReserva.EM_ANALISE;
    }

    if (slots.every((slot) => slot.status === 'reservado')) {
        return SituacaoReserva.INATIVA;
    }

    if (slots.some((slot) => slot.status === 'solicitado' || slot.status === 'selecionado' || slot.status === 'livre')) {
        return SituacaoReserva.EM_ANALISE;
    }

    if (slots.every((slot) => slot.status === SituacaoReserva.DEFERIDA)) {
        return SituacaoReserva.DEFERIDA;
    }

    if (slots.every((slot) => slot.status === SituacaoReserva.INDEFERIDA)) {
        return SituacaoReserva.INDEFERIDA;
    }

    return SituacaoReserva.PARCIALMENTE_DEFERIDA;
}
