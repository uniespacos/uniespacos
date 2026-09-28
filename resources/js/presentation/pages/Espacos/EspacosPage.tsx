import GenericHeader from '@/presentation/molecules/GenericHeader';
import PaginacaoListas from '@/presentation/molecules/PaginacaoListas';
import EspacoCard from '@/presentation/organisms/EspacoCard';
import EspacoFiltroBusca from '@/presentation/organisms/EspacoFiltroBusca';
import AppLayout from '@/presentation/templates/AppLayout';
import { Andar, Espaco, Modulo, Unidade, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from '@/i18n';

const breadcrumbs = [
    {
        title: 'Consultar Espaços',
        href: '/espacos',
    },
];

export default function EspacosPage() {
    const { t } = useTranslation();
    const {
        andares,
        modulos,
        unidades,
        user,
        espacos: { data: espacos, links },
        filters,
        capacidadeEspacos,
    } = usePage<{
        espacos: {
            data: Espaco[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        unidades: Unidade[];
        modulos: Modulo[];
        andares: Andar[];
        filters: {
            search?: string;
            unidade?: string;
            modulo?: string;
            andar?: string;
            capacidade?: string;
        };
        user: User;
        capacidadeEspacos: number[];
    }>().props;

    const handleSolicitarReserva = (espacoId: string) => {
        router.get(`/espacos/${espacoId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('espacos.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <GenericHeader
                    titulo={t('espacos.consultar_espacos')}
                    descricao={t('espacos.consultar_espacos_desc')}
                />

                <EspacoFiltroBusca
                    route={route('espacos.index')}
                    unidades={unidades}
                    modulos={modulos}
                    andares={andares}
                    filters={filters}
                    capacidadeEspacos={capacidadeEspacos}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                    {espacos.map((espaco) => (
                        <EspacoCard key={espaco.id} espaco={espaco} user={user} handleSolicitarReserva={handleSolicitarReserva} />
                    ))}
                </div>

                <PaginacaoListas links={links} only={['espacos', 'filters']} />
            </div>
        </AppLayout>
    );
}
