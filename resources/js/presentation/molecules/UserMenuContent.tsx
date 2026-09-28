import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/dropdown-menu';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { SUPPORTED_LOCALES, type SupportedLocale, useTranslation } from '@/i18n';
import { UserInfo } from '@/presentation/molecules/UserInfo';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Check, Globe, LogOut, Settings } from 'lucide-react';

declare function route(name: string, params?: unknown): string;

const LOCALE_LABELS: Record<SupportedLocale, { label: string; flag: string }> = {
    'pt-BR': { label: 'Português (Brasil)', flag: '🇧🇷' },
    en: { label: 'English', flag: '🇺🇸' },
    es: { label: 'Español', flag: '🇪🇸' },
};

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const { locale, t } = useTranslation();

    const handleLocaleChange = (newLocale: SupportedLocale) => {
        if (newLocale === locale) return;
        cleanup();

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

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full cursor-pointer" href={route('settings.profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t('auth.profile.title')}
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer">
                        <Globe className="mr-2 h-4 w-4" />
                        <span>{t('common.language.selectLanguage')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {SUPPORTED_LOCALES.map((loc) => {
                            const info = LOCALE_LABELS[loc];
                            const isSelected = loc === locale;

                            return (
                                <DropdownMenuItem
                                    key={loc}
                                    onClick={() => {
                                        handleLocaleChange(loc);
                                    }}
                                    className="flex items-center justify-between cursor-pointer text-xs"
                                >
                                    <span className="flex items-center gap-2">
                                        <span>{info.flag}</span>
                                        <span>{info.label}</span>
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                                </DropdownMenuItem>
                            );
                        })}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer" method="post" href={route('logout')} as="button" onClick={cleanup}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Link>
            </DropdownMenuItem>
        </>
    );
}
