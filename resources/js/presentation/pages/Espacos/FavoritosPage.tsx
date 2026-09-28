import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import PaginacaoListas from '@/presentation/molecules/PaginacaoListas';
import EspacoCard from '@/presentation/organisms/EspacoCard';
import AppLayout from '@/presentation/templates/AppLayout';
import { Espaco, User } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';

const breadcrumbs = [
    {
        title: 'Meus Favoritos',
        href: '/espacos/favoritos',
    },
];

export default function FavoritosPage() {
    const { t } = useTranslation();
    const {
        favoritos: { data: espacosFavoritos, links },
        user,
    } = usePage<{
        favoritos: {
            data: Espaco[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        user: User;
    }>().props;

    const handleSolicitarReserva = (espacoId: string) => {
        router.get(`/espacos/${espacoId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('espacos.favoritos_titulo')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <GenericHeader titulo={t('espacos.favoritos_titulo')} descricao={t('espacos.favoritos_desc')} />

                {espacosFavoritos.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                        {espacosFavoritos.map((espaco) => (
                            <EspacoCard key={espaco.id} espaco={espaco} user={user} handleSolicitarReserva={handleSolicitarReserva} />
                        ))}
                    </div>
                ) : (
                    <div className="text-muted-foreground py-10 text-center">
                        <p>{t('espacos.sem_favoritos_desc')}</p>
                        <Link href={route('espacos.index')} className="text-primary mt-4 block hover:underline">
                            {t('espacos.consultar_espacos')}
                        </Link>
                    </div>
                )}

                {espacosFavoritos.length > 0 && links.length > 1 && <PaginacaoListas links={links} />}
            </div>
        </AppLayout>
    );
}
