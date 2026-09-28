import { format, isValid, parseISO } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';
import { DEFAULT_LOCALE } from './types';
import type { SupportedLocale } from './types';

const DATE_FNS_LOCALES: Record<SupportedLocale, Locale> = {
    'pt-BR': ptBR,
    en: enUS,
    es: es,
};

export function formatDate(
    date: string | Date | null | undefined,
    pattern = 'dd/MM/yyyy',
    locale: SupportedLocale = DEFAULT_LOCALE
): string {
    if (!date) return '—';

    try {
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        if (!isValid(parsedDate)) {
            const fallbackDate = typeof date === 'string' ? new Date(date) : date;
            if (!isValid(fallbackDate)) return '—';
            return format(fallbackDate, pattern, { locale: DATE_FNS_LOCALES[locale] });
        }
        return format(parsedDate, pattern, { locale: DATE_FNS_LOCALES[locale] });
    } catch {
        return '—';
    }
}

export function formatDateTime(
    date: string | Date | null | undefined,
    locale: SupportedLocale = DEFAULT_LOCALE
): string {
    const pattern = locale === 'en' ? 'MM/dd/yyyy, hh:mm a' : "dd 'de' MMMM 'de' yyyy, HH:mm";
    return formatDate(date, pattern, locale);
}

export function formatNumber(
    value: number | null | undefined,
    locale: SupportedLocale = DEFAULT_LOCALE,
    options?: Intl.NumberFormatOptions
): string {
    if (value === null || value === undefined || typeof value !== 'number' || Number.isNaN(value)) {
        return '—';
    }

    try {
        return new Intl.NumberFormat(locale, options).format(value);
    } catch {
        return String(value);
    }
}
