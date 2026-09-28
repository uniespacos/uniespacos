import React from 'react';
import { router } from '@inertiajs/react';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LOCALES, type SupportedLocale, useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

declare function route(name: string, params?: unknown): string;

const LOCALE_LABELS: Record<SupportedLocale, { label: string; short: string; flag: string }> = {
    'pt-BR': { label: 'Português (Brasil)', short: 'PT', flag: '🇧🇷' },
    en: { label: 'English', short: 'EN', flag: '🇺🇸' },
    es: { label: 'Español', short: 'ES', flag: '🇪🇸' },
};

export interface LanguageSelectorProps {
    className?: string;
    variant?: 'icon' | 'full' | 'menu-item';
}

export function LanguageSelector({ className, variant = 'icon' }: LanguageSelectorProps) {
    const { locale, t } = useTranslation();

    const handleLocaleChange = (newLocale: SupportedLocale) => {
        if (newLocale === locale) return;

        try {
            router.post(
                route('locale.update', { locale: newLocale }),
                {},
                {
                    preserveScroll: true,
                    
                },
            );
        } catch {
            router.post(
                `/locale/${newLocale}`,
                {},
                {
                    preserveScroll: true,
                    
                },
            );
        }
    };

    const currentInfo = LOCALE_LABELS[locale];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size={variant === 'icon' ? 'icon' : 'sm'}
                    className={cn(
                        'text-muted-foreground hover:text-foreground h-9 gap-1.5 px-2 text-xs font-medium cursor-pointer',
                        className,
                    )}
                    aria-label={t('common.language.selectLanguage')}
                >
                    <Globe className="h-4 w-4" />
                    {variant !== 'icon' && (
                        <span className="hidden sm:inline-flex items-center gap-1">
                            <span>{currentInfo.flag}</span>
                            <span>{currentInfo.short}</span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
                {SUPPORTED_LOCALES.map((loc) => {
                    const info = LOCALE_LABELS[loc];
                    const isSelected = loc === locale;

                    return (
                        <DropdownMenuItem
                            key={loc}
                            onClick={() => {
                                handleLocaleChange(loc);
                            }}
                            className={cn(
                                'flex items-center justify-between cursor-pointer text-xs font-medium',
                                isSelected && 'bg-primary/10 text-primary font-semibold',
                            )}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-sm">{info.flag}</span>
                                <span>{info.label}</span>
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default LanguageSelector;
