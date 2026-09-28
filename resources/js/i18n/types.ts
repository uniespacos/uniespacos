export type SupportedLocale = 'pt-BR' | 'en' | 'es';

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['pt-BR', 'en', 'es'] as const;

export const DEFAULT_LOCALE: SupportedLocale = 'pt-BR';

export type TranslationParams = Record<string, string | number>;
