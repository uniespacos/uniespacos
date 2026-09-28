import { useTranslation } from '@/i18n';
import HeadingSmall from '@/presentation/atoms/HeadingSmall';
import AppearanceTabs from '@/presentation/molecules/AppearanceTabs';
import AppLayout from '@/presentation/templates/AppLayout';
import SettingsLayout from '@/presentation/templates/settings/Layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Aparência',
        href: '/settings/appearance',
    },
];

export default function Appearance() {
    const { t } = useTranslation();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.appearance.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('settings.appearance.title')}
                        description={t('settings.appearance.desc')}
                    />
                    <AppearanceTabs />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
