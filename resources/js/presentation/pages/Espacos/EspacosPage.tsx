import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import PaginacaoListas from '@/presentation/molecules/PaginacaoListas';
import EspacoCard from '@/presentation/organisms/EspacoCard';
import EspacoFiltroBusca from '@/presentation/organisms/EspacoFiltroBusca';
import AppLayout from '@/presentation/templates/AppLayout';
import { Andar, Espaco, Modulo, Unidade, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { RotateCcw, SearchX } from 'lucide-react';

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

    const hasActiveFilters =
        Boolean(filters.search) ||
        Boolean(filters.unidade && filters.unidade !== 'all') ||
        Boolean(filters.modulo && filters.modulo !== 'all') ||
        Boolean(filters.andar && filters.andar !== 'all') ||
        Boolean(filters.capacidade && filters.capacidade !== 'qualquer');

    const handleSolicitarReserva = (espacoId: string) => {
        router.get(route('espacos.show', espacoId));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('espacos.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <GenericHeader titulo={t('espacos.consultar_espacos')} descricao={t('espacos.consultar_espacos_desc')} />

                <EspacoFiltroBusca
                    route={route('espacos.index')}
                    unidades={unidades}
                    modulos={modulos}
                    andares={andares}
                    filters={filters}
                    capacidadeEspacos={capacidadeEspacos}
                />

                {espacos.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                            {espacos.map((espaco) => (
                                <EspacoCard key={espaco.id} espaco={espaco} user={user} handleSolicitarReserva={handleSolicitarReserva} />
                            ))}
                        </div>

                        <PaginacaoListas links={links} only={['espacos', 'filters']} />
                    </>
                ) : (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                            <div className="bg-muted text-muted-foreground rounded-full p-3.5">
                                <SearchX className="h-6 w-6" />
                            </div>
                            <div className="max-w-md space-y-1">
                                <h2 className="text-foreground text-base font-semibold">{t('espacos.empty.title')}</h2>
                                <p className="text-muted-foreground text-sm">{t('espacos.empty.desc')}</p>
                            </div>
                            {hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        router.get(route('espacos.index'));
                                    }}
                                    className="mt-1 gap-1.5"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {t('espacos.limpar_filtros')}
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
