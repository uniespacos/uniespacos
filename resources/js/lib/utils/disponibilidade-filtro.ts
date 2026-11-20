import { Turno, type TurnoType } from '@/contracts/turnos.contract';
import type { SupportedLocale } from '@/i18n/types';
import { assertNever } from '@/lib/utils/exhaustive';
import { type Locale, format, parseISO } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = {
    'pt-BR': ptBR,
    en: enUS,
    es,
};

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

export function formatarDataFiltro(dataIso: string, locale: SupportedLocale = 'pt-BR'): string {
    const dateLocale = DATE_FNS_LOCALES[locale];
    const padrao = locale === 'pt-BR' ? 'EEEEEE, dd/MM' : 'EEE, dd/MM';

    return format(parseISO(dataIso), padrao, { locale: dateLocale }).replace('.', '');
}

export function capacidadeValida(valor: string | undefined): string {
    return valor !== undefined && /^[1-9]\d*$/.test(valor) ? valor : '';
}
