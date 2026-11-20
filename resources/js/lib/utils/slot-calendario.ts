import type { TranslationKey } from '@/i18n';
import { assertNever } from '@/lib/utils/exhaustive';
import type { SlotCalendario } from '@/types';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function slotPodeSerSelecionado(slot: SlotCalendario): boolean {
    return slot.status !== 'reservado' && !slot.isLocked && !slot.isPast;
}

export function ordenarSelecaoSlots(slots: SlotCalendario[]): SlotCalendario[] {
    return [...slots].sort((a, b) => a.data.getTime() - b.data.getTime() || a.horario_inicio.localeCompare(b.horario_inicio));
}

export function aplicarSelecaoDeSlots(atual: SlotCalendario[], slots: SlotCalendario[], selecionar: boolean): SlotCalendario[] {
    const elegiveis = slots.filter(slotPodeSerSelecionado);

    if (selecionar) {
        const idsAtuais = new Set(atual.map((s) => s.id));
        const novos = elegiveis.filter((s) => !idsAtuais.has(s.id));

        return novos.length === 0 ? atual : ordenarSelecaoSlots([...atual, ...novos]);
    }

    const idsParaRemover = new Set(elegiveis.map((s) => s.id));

    return atual.filter((s) => !idsParaRemover.has(s.id));
}

/**
 * Intervalo do Shift+clique. `candidatos` são os slots de uma única seção (mesma agenda/turno);
 * se âncora ou alvo não couberem nessa seção, não selecionáveis ou em dias diferentes, retorna `null`
 * para que o chamador trate como clique simples.
 */
export function slotsDoIntervaloShift(candidatos: readonly SlotCalendario[], ancora: SlotCalendario, alvo: SlotCalendario): SlotCalendario[] | null {
    const ancoraNaSecao = candidatos.find((c) => c.id === ancora.id);

    if (!ancoraNaSecao || !slotPodeSerSelecionado(ancoraNaSecao) || !slotPodeSerSelecionado(alvo)) {
        return null;
    }

    if (!isSameDay(ancoraNaSecao.data, alvo.data)) {
        return null;
    }

    const menor = ancoraNaSecao.horario_inicio < alvo.horario_inicio ? ancoraNaSecao.horario_inicio : alvo.horario_inicio;
    const maior = ancoraNaSecao.horario_inicio < alvo.horario_inicio ? alvo.horario_inicio : ancoraNaSecao.horario_inicio;

    const doIntervalo = candidatos.filter(
        (c) => isSameDay(c.data, alvo.data) && slotPodeSerSelecionado(c) && c.horario_inicio >= menor && c.horario_inicio <= maior,
    );

    return ordenarSelecaoSlots(doIntervalo);
}

export function descricaoDiaSlot(data: Date): string {
    const diaSemana = format(data, 'EEEE', { locale: ptBR });

    return `${diaSemana.charAt(0).toUpperCase()}${diaSemana.slice(1)}, ${format(data, 'dd/MM')}`;
}

export function chaveEstadoSlot(slot: SlotCalendario, isSelecionado: boolean): TranslationKey {
    if (isSelecionado) {
        return 'agenda.slot.estado.selecionado';
    }

    if (slot.status === 'livre' && slot.isPast) {
        return 'agenda.slot.estado.encerrado';
    }

    switch (slot.status) {
        case 'livre':
            return 'agenda.slot.estado.livre';
        case 'selecionado':
            return 'agenda.slot.estado.selecionado';
        case 'reservado':
            return 'agenda.slot.estado.reservado';
        case 'solicitado':
            return 'agenda.slot.estado.solicitado';
        case 'deferida':
            return 'agenda.slot.estado.deferida';
        case 'indeferida':
            return 'agenda.slot.estado.indeferida';
        default:
            return assertNever(slot.status);
    }
}
