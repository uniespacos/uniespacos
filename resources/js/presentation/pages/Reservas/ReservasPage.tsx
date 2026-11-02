import { useTranslation } from '@/i18n';
import { type ReservasFilterQuery, ReservasWorkspace } from '@/presentation/organisms/ReservasWorkspace';
import AppLayout from '@/presentation/templates/AppLayout';
import { type BreadcrumbItem, type Paginator, type Reserva, type User } from '@/types';
import { Head } from '@inertiajs/react';
import { PlusCircle } from 'lucide-react';
import { useMemo } from 'react';

declare function route(name: string, params?: unknown): string;

export default function ReservasPage({
    user,
    filters,
    reservas: paginator,
    reservaToShow,
}: {
    user: User;
    reservas: Paginator<Reserva>;
    filters: ReservasFilterQuery;
    reservaToShow?: Reserva;
}) {
    const { t } = useTranslation();

    const breadcrumbs = useMemo<BreadcrumbItem[]>(
        () => [
            {
                title: t('reservas.titulo'),
                href: '/reservas',
            },
        ],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('reservas.titulo')} />
            <ReservasWorkspace
                title={t('reservas.titulo')}
                description={t('reservas.subtitulo')}
                routeName="reservas.index"
                isGestor={false}
                paginator={paginator}
                filters={filters}
                user={user}
                reservaToShow={reservaToShow}
                headerIcon={PlusCircle}
                headerButtonText={t('dashboard.actions.solicitar_reserva')}
                headerButtonLink={route('espacos.index')}
            />
        </AppLayout>
    );
}
