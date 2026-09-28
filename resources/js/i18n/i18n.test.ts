import { renderHook } from '@testing-library/react';
import { usePage } from '@inertiajs/react';
import {
    DICTIONARIES,
    DEFAULT_LOCALE,
    SUPPORTED_LOCALES,
    isSupportedLocale,
    translate,
    useTranslation,
    formatDate,
    formatDateTime,
    formatNumber,
} from './index';
import { ptBR } from './locales/pt-BR';
import { en } from './locales/en';
import { es } from './locales/es';
import type { SupportedLocale } from './types';
import type { TranslationKey } from './schema';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
}));

const mockedUsePage = usePage as jest.Mock;

describe('i18n Engine & Dictionaries', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUsePage.mockReturnValue({
            props: { locale: 'pt-BR' },
        });
    });

    describe('Constants and Guards', () => {
        it('should define correct default and supported locales', () => {
            expect(DEFAULT_LOCALE).toBe('pt-BR');
            expect(SUPPORTED_LOCALES).toEqual(['pt-BR', 'en', 'es']);
        });

        it('isSupportedLocale should correctly validate locales', () => {
            expect(isSupportedLocale('pt-BR')).toBe(true);
            expect(isSupportedLocale('en')).toBe(true);
            expect(isSupportedLocale('es')).toBe(true);
            expect(isSupportedLocale('fr')).toBe(false);
            expect(isSupportedLocale(null)).toBe(false);
            expect(isSupportedLocale(undefined)).toBe(false);
            expect(isSupportedLocale(123)).toBe(false);
        });
    });

    describe('Dictionary Structure & Parity', () => {
        it('should have all supported locales registered in DICTIONARIES', () => {
            expect(DICTIONARIES['pt-BR']).toBe(ptBR);
            expect(DICTIONARIES.en).toBe(en);
            expect(DICTIONARIES.es).toBe(es);
        });

        const getKeysRecursively = (obj: Record<string, unknown>, prefix = ''): string[] => {
            return Object.entries(obj).flatMap(([key, value]) => {
                const currentKey = prefix ? `${prefix}.${key}` : key;
                if (value && typeof value === 'object') {
                    return getKeysRecursively(value as Record<string, unknown>, currentKey);
                }
                return [currentKey];
            });
        };

        it('en and es dictionaries must have 100% key parity with pt-BR', () => {
            const ptKeys = getKeysRecursively(ptBR).sort();
            const enKeys = getKeysRecursively(en).sort();
            const esKeys = getKeysRecursively(es).sort();

            expect(enKeys).toEqual(ptKeys);
            expect(esKeys).toEqual(ptKeys);
        });

        it('dictionaries must be tenant-neutral without hardcoded UESB', () => {
            const allStrings = [
                ...Object.values(ptBR).flatMap(v => getKeysRecursively(v as unknown as Record<string, unknown>)),
                ...Object.values(en).flatMap(v => getKeysRecursively(v as unknown as Record<string, unknown>)),
                ...Object.values(es).flatMap(v => getKeysRecursively(v as unknown as Record<string, unknown>)),
            ];

            const jsonPt = JSON.stringify(ptBR);
            const jsonEn = JSON.stringify(en);
            const jsonEs = JSON.stringify(es);

            expect(jsonPt).not.toContain('UESB');
            expect(jsonEn).not.toContain('UESB');
            expect(jsonEs).not.toContain('UESB');
            expect(allStrings.length).toBeGreaterThan(0);
        });
    });

    describe('translate() pure function', () => {
        it('should translate keys correctly in pt-BR', () => {
            expect(translate('common.actions.save', undefined, 'pt-BR')).toBe('Salvar');
            expect(translate('reservas.situacao.deferida', undefined, 'pt-BR')).toBe('Deferida');
            expect(translate('auth.login.title', undefined, 'pt-BR')).toBe('Entrar na sua conta');
        });

        it('should translate keys correctly in en', () => {
            expect(translate('common.actions.save', undefined, 'en')).toBe('Save');
            expect(translate('reservas.situacao.deferida', undefined, 'en')).toBe('Approved');
            expect(translate('auth.login.title', undefined, 'en')).toBe('Sign in to your account');
        });

        it('should translate keys correctly in es', () => {
            expect(translate('common.actions.save', undefined, 'es')).toBe('Guardar');
            expect(translate('reservas.situacao.deferida', undefined, 'es')).toBe('Aprobada');
            expect(translate('auth.login.title', undefined, 'es')).toBe('Iniciar sesión en su cuenta');
        });

        it('should interpolate single and multiple parameters with/without whitespace', () => {
            expect(
                translate('reservas.stepper.success_created', { institution_name: 'Campus Virtual' }, 'pt-BR')
            ).toBe('Sua solicitação de reserva foi enviada com sucesso para Campus Virtual!');

            expect(
                translate('espacos.capacidade', { count: 120 }, 'pt-BR')
            ).toBe('Capacidade: 120 pessoas');

            expect(
                translate('reservas.detalhes.avaliado_por', { name: 'Maria Silva', date: '25/08/2026' }, 'pt-BR')
            ).toBe('Avaliado por Maria Silva em 25/08/2026');
        });

        it('should return the raw key on missing or invalid translation paths', () => {
            const nonExistentKey = 'common.non_existent_key' as unknown as TranslationKey;
            expect(translate(nonExistentKey, undefined, 'pt-BR')).toBe('common.non_existent_key');

            const nonStringKey = 'common.actions' as unknown as TranslationKey;
            expect(translate(nonStringKey, undefined, 'pt-BR')).toBe('common.actions');
        });

        it('should fallback to default locale when given an invalid locale', () => {
            const invalidLocale = 'fr' as unknown as SupportedLocale;
            expect(translate('common.actions.save', undefined, invalidLocale)).toBe('Salvar');
        });
    });

    describe('formatters', () => {
        describe('formatDate', () => {
            it('should format ISO string dates correctly', () => {
                const result = formatDate('2026-08-25T12:00:00.000Z', 'dd/MM/yyyy', 'pt-BR');
                expect(result).toBe('25/08/2026');
            });

            it('should format Date objects correctly', () => {
                const date = new Date(2026, 7, 25);
                const result = formatDate(date, 'yyyy-MM-dd', 'pt-BR');
                expect(result).toBe('2026-08-25');
            });

            it('should return placeholder for null, undefined, or invalid dates', () => {
                expect(formatDate(null)).toBe('—');
                expect(formatDate(undefined)).toBe('—');
                expect(formatDate('')).toBe('—');
                expect(formatDate('invalid-date-string')).toBe('—');
            });
        });

        describe('formatDateTime', () => {
            it('should format date and time according to locale', () => {
                const date = new Date(2026, 7, 25, 14, 30);
                const ptResult = formatDateTime(date, 'pt-BR');
                expect(ptResult).toContain('25 de agosto de 2026');
                expect(ptResult).toContain('14:30');

                const enResult = formatDateTime(date, 'en');
                expect(enResult).toContain('08/25/2026');

                const esResult = formatDateTime(date, 'es');
                expect(esResult).toContain('25 de agosto de 2026');
            });

            it('should return placeholder for invalid date in formatDateTime', () => {
                expect(formatDateTime(null)).toBe('—');
                expect(formatDateTime('invalid')).toBe('—');
            });
        });

        describe('formatNumber', () => {
            it('should format numbers with locale decimals', () => {
                const ptFormatted = formatNumber(1234567.89, 'pt-BR');
                expect(ptFormatted).toContain('1.234.567,89');

                const enFormatted = formatNumber(1234567.89, 'en');
                expect(enFormatted).toContain('1,234,567.89');
            });

            it('should support Intl options such as currency and percent', () => {
                const currency = formatNumber(150.5, 'pt-BR', { style: 'currency', currency: 'BRL' });
                expect(currency).toContain('150,50');

                const percent = formatNumber(0.75, 'pt-BR', { style: 'percent' });
                expect(percent).toBe('75%');
            });

            it('should return placeholder for null, undefined, or NaN', () => {
                expect(formatNumber(null)).toBe('—');
                expect(formatNumber(undefined)).toBe('—');
                expect(formatNumber(NaN)).toBe('—');
            });
        });
    });

    describe('useTranslation hook', () => {
        it('should use locale from Inertia usePage props', () => {
            mockedUsePage.mockReturnValue({
                props: { locale: 'en' },
            });

            const { result } = renderHook(() => useTranslation());

            expect(result.current.locale).toBe('en');
            expect(result.current.t('common.actions.save')).toBe('Save');
            expect(result.current.t('reservas.situacao.deferida')).toBe('Approved');
        });

        it('should use Spanish when Inertia prop is es', () => {
            mockedUsePage.mockReturnValue({
                props: { locale: 'es' },
            });

            const { result } = renderHook(() => useTranslation());

            expect(result.current.locale).toBe('es');
            expect(result.current.t('common.actions.save')).toBe('Guardar');
        });

        it('should fallback to pt-BR when Inertia prop locale is missing or invalid', () => {
            mockedUsePage.mockReturnValue({
                props: {},
            });

            const { result } = renderHook(() => useTranslation());

            expect(result.current.locale).toBe('pt-BR');
            expect(result.current.t('common.actions.save')).toBe('Salvar');
        });

        it('should handle outside-Inertia render gracefully', () => {
            mockedUsePage.mockImplementation(() => {
                throw new Error('usePage must be used within Inertia');
            });

            const { result } = renderHook(() => useTranslation());

            expect(result.current.locale).toBe('pt-BR');
            expect(result.current.t('common.actions.save')).toBe('Salvar');
        });

        it('should expose bound formatters with the current locale', () => {
            mockedUsePage.mockReturnValue({
                props: { locale: 'en' },
            });

            const { result } = renderHook(() => useTranslation());
            const date = new Date(2026, 7, 25, 10, 0);

            expect(result.current.formatDate(date, 'MM/dd/yyyy')).toBe('08/25/2026');
            expect(result.current.formatDateTime(date)).toContain('08/25/2026');
            expect(result.current.formatNumber(1000.5)).toContain('1,000.5');
        });
    });
});
