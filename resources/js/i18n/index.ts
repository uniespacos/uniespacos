import { usePage } from '@inertiajs/react';
import { en } from './locales/en';
import { es } from './locales/es';
import { ptBR } from './locales/pt-BR';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';
import type { SupportedLocale, TranslationParams } from './types';
import type { TranslationKey, TranslationSchema } from './schema';
import { formatDate, formatDateTime, formatNumber } from './formatters';

export const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
    'pt-BR': ptBR,
    en,
    es,
};

export function isSupportedLocale(locale: unknown): locale is SupportedLocale {
    return typeof locale === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function translate(
    key: TranslationKey,
    params?: TranslationParams,
    locale: SupportedLocale = DEFAULT_LOCALE
): string {
    const activeLocale = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
    const dictionary = DICTIONARIES[activeLocale];

    const keys = key.split('.');
    let result: unknown = dictionary;

    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = (result as Record<string, unknown>)[k];
        } else {
            return key;
        }
    }

    if (typeof result !== 'string') {
        return key;
    }

    if (params) {
        return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
            return str.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(paramValue));
        }, result);
    }

    return result;
}

export function useTranslation() {
    let locale: SupportedLocale = DEFAULT_LOCALE;

    try {
        const page = usePage<{ locale?: string }>();
        const pageLocale = page.props.locale;
        if (isSupportedLocale(pageLocale)) {
            locale = pageLocale;
        }
    } catch {
        locale = DEFAULT_LOCALE;
    }

    const t = (key: TranslationKey, params?: TranslationParams): string => {
        return translate(key, params, locale);
    };

    return {
        t,
        locale,
        formatDate: (date: string | Date | null | undefined, pattern?: string) =>
            formatDate(date, pattern, locale),
        formatDateTime: (date: string | Date | null | undefined) =>
            formatDateTime(date, locale),
        formatNumber: (value: number | null | undefined, options?: Intl.NumberFormatOptions) =>
            formatNumber(value, locale, options),
    };
}

export * from './types';
export * from './schema';
export * from './formatters';
