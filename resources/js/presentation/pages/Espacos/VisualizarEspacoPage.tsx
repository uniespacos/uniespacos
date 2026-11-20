import { useEspacoLiveUpdates } from '@/hooks/use-espaco-live-updates';
import { useReservationLiveUpdates } from '@/hooks/use-reservation-live-updates';
import { useTranslation } from '@/i18n';
import AgendaEspaço from '@/presentation/organisms/EspacoAgenda';
import AppLayout from '@/presentation/templates/AppLayout';
import { BreadcrumbItem, Espaco, Reserva } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo } from 'react';

export default function VisualizarEspaço({
    espaco,
    reserva,
    isEditMode,
    semana,
}: {
    espaco: Espaco;
    reserva?: Reserva;
    isEditMode?: boolean;
    semana: {
        inicio: string;
        fim: string;
        referencia: string;
    };
}) {
    const { t } = useTranslation();
    useReservationLiveUpdates();
    useEspacoLiveUpdates(espaco.id);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;

        const handleUpdate = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                router.reload({ only: ['espaco'] });
            }, 400);
        };

        document.addEventListener('reserva:updated', handleUpdate);

        return () => {
            document.removeEventListener('reserva:updated', handleUpdate);
            clearTimeout(timer);
        };
    }, []);

    const breadcrumbs = useMemo<BreadcrumbItem[]>(
        () => [
            {
                title: isEditMode ? t('nav.minhas_reservas') : t('espacos.titulo'),
                href: isEditMode ? '/reservas' : '/espacos',
            },
            {
                title: isEditMode ? t('reservas.acoes.editar') : espaco.nome,
                href: isEditMode && reserva ? `/reservas/${String(reserva.id)}/edit` : `/espacos/${String(espaco.id)}`,
            },
        ],
        [isEditMode, reserva, espaco.id, espaco.nome, t],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('espacos.agenda_titulo_com_nome', { nome: espaco.nome })} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <AgendaEspaço isEditMode={!!reserva} reserva={reserva} espaco={espaco} semana={semana} />
            </div>
        </AppLayout>
    );
}
