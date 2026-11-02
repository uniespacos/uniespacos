import { usePage } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { formatDate, formatDateTime, formatNumber } from './formatters';
import { en } from './locales/en';
import { es } from './locales/es';
import { ptBR } from './locales/pt-BR';
import type { TranslationKey, TranslationSchema } from './schema';
import type { SupportedLocale, TranslationParams } from './types';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';

export const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
    'pt-BR': ptBR,
    en,
    es,
};

export function isSupportedLocale(locale: unknown): locale is SupportedLocale {
    return typeof locale === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

export function translate(key: TranslationKey, params?: TranslationParams, locale: SupportedLocale = DEFAULT_LOCALE): string {
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

    const t = useCallback(
        (key: TranslationKey, params?: TranslationParams): string => {
            return translate(key, params, locale);
        },
        [locale],
    );

    const boundFormatDate = useCallback((date: string | Date | null | undefined, pattern?: string) => formatDate(date, pattern, locale), [locale]);

    const boundFormatDateTime = useCallback((date: string | Date | null | undefined) => formatDateTime(date, locale), [locale]);

    const boundFormatNumber = useCallback(
        (value: number | null | undefined, options?: Intl.NumberFormatOptions) => formatNumber(value, locale, options),
        [locale],
    );

    return useMemo(
        () => ({
            t,
            locale,
            formatDate: boundFormatDate,
            formatDateTime: boundFormatDateTime,
            formatNumber: boundFormatNumber,
        }),
        [t, locale, boundFormatDate, boundFormatDateTime, boundFormatNumber],
    );
}

export * from './formatters';
export * from './schema';
export * from './types';
