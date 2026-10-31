import { useTranslation } from '@/i18n';
import { type ReservasFilterQuery, ReservasWorkspace } from '@/presentation/organisms/ReservasWorkspace';
import AppLayout from '@/presentation/templates/AppLayout';
import { type BreadcrumbItem, type Paginator, type Reserva, type User } from '@/types';
import { Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';

export default function ReservasGestorPage({
    reservas: paginator,
    filters,
    user,
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
                title: t('reservas.gestor_titulo'),
                href: '/gestor/reservas',
            },
        ],
        [t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('reservas.gestor_titulo')} />
            <ReservasWorkspace
                title={t('reservas.gestor_titulo')}
                description={t('reservas.gestor_subtitulo')}
                routeName="gestor.reservas.index"
                isGestor={true}
                paginator={paginator}
                filters={filters}
                user={user}
                reservaToShow={reservaToShow}
                headerIcon={ShieldCheck}
            />
        </AppLayout>
    );
}
