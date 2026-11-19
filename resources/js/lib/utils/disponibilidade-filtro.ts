import { Turno, type TurnoType } from '@/contracts/turnos.contract';
import { assertNever } from '@/lib/utils/exhaustive';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function parseTurnoFiltro(valor: string | undefined): TurnoType | undefined {
    return Object.values(Turno).find((turno) => turno === valor);
}

export function chaveTurnoFiltro(turno: TurnoType) {
    switch (turno) {
        case Turno.MANHA:
            return 'espacos.filtros.turno_manha' as const;
        case Turno.TARDE:
            return 'espacos.filtros.turno_tarde' as const;
        case Turno.NOITE:
            return 'espacos.filtros.turno_noite' as const;
        default:
            return assertNever(turno);
    }
}

export function formatarDataFiltro(dataIso: string): string {
    return format(parseISO(dataIso), 'EEEEEE, dd/MM', { locale: ptBR });
}

export function capacidadeValida(valor: string | undefined): string {
    return valor !== undefined && /^[1-9]\d*$/.test(valor) ? valor : '';
}
