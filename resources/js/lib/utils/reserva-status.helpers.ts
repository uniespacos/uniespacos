import { assertNever } from '@/lib/utils/exhaustive';
import { Horario, SituacaoReserva, SlotCalendario } from '@/types';

export function mapearStatusBackendParaSlot(status: Horario['situacao']): SlotCalendario['status'] {
    switch (status) {
        case 'em_analise':
            return 'solicitado';
        case 'deferida':
            return 'deferida';
        case 'indeferida':
            return 'indeferida';
        case 'inativa':
            return 'reservado';
        default:
            return assertNever(status);
    }
}

export function verificarStatusReserva(slots: SlotCalendario[]): SituacaoReserva {
    if (slots.length === 0) return 'em_analise';
    const slotsAvaliáveis = slots.filter((slot) => !slot.isLocked);
    if (slotsAvaliáveis.length === 0) return 'em_analise';

    const todosIndeferidos = slotsAvaliáveis.every((slot) => slot.status === 'indeferida');
    if (todosIndeferidos) return 'indeferida';

    const todosDeferidos = slotsAvaliáveis.every((slot) => slot.status === 'deferida');
    if (todosDeferidos) return 'deferida';

    const temDeferidos = slotsAvaliáveis.some((slot) => slot.status === 'deferida');
    if (temDeferidos) return 'parcialmente_deferida';

    return 'em_analise';
}
