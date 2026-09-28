import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useTranslation, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';
import Heading from '@/presentation/atoms/Heading';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

interface SettingsNavItem {
    title: string;
    titleKey: TranslationKey;
    href: string;
}

const sidebarNavItems: SettingsNavItem[] = [
    {
        title: 'Perfil',
        titleKey: 'settings.nav.profile',
        href: '/settings/profile',
    },
    {
        title: 'Senha',
        titleKey: 'settings.nav.password',
        href: '/settings/password',
    },
    {
        title: 'Aparência',
        titleKey: 'settings.nav.appearance',
        href: '/settings/appearance',
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { t } = useTranslation();

    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title={t('settings.titulo')} description={t('settings.subtitulo')} />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.href,
                                })}
                            >
                                <Link href={item.href} prefetch>
                                    {t(item.titleKey)}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
