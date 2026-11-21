import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { chaveTurnoFiltro, formatarDataFiltro, parseTurnoFiltro } from '@/lib/utils/disponibilidade-filtro';
import { EmptyState } from '@/presentation/molecules/EmptyState';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import PaginacaoListas from '@/presentation/molecules/PaginacaoListas';
import EspacoCard from '@/presentation/organisms/EspacoCard';
import EspacoFiltroBusca from '@/presentation/organisms/EspacoFiltroBusca';
import AppLayout from '@/presentation/templates/AppLayout';
import { Andar, Espaco, Modulo, Unidade, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { RotateCcw, SearchX } from 'lucide-react';
import { useMemo } from 'react';

export default function EspacosPage() {
    const { t } = useTranslation();
    const breadcrumbs = useMemo(() => [{ title: t('espacos.consultar_espacos'), href: '/espacos' }], [t]);
    const {
        andares,
        modulos,
        unidades,
        user,
        espacos: { data: espacos, links },
        filters,
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
            data?: string;
            turno?: string;
        };
        user: User;
    }>().props;

    const hasActiveFilters =
        Boolean(filters.search) ||
        Boolean(filters.unidade && filters.unidade !== 'all') ||
        Boolean(filters.modulo && filters.modulo !== 'all') ||
        Boolean(filters.andar && filters.andar !== 'all') ||
        Boolean(filters.capacidade && filters.capacidade !== 'qualquer') ||
        Boolean(filters.data) ||
        Boolean(filters.turno);

    const turnoFiltrado = parseTurnoFiltro(filters.turno);
    const resumoDisponibilidade = filters.data
        ? turnoFiltrado
            ? t('espacos.filtros.disponibilidade_resumo_turno', {
                  data: formatarDataFiltro(filters.data),
                  turno: t(chaveTurnoFiltro(turnoFiltrado)).toLowerCase(),
              })
            : t('espacos.filtros.disponibilidade_resumo', { data: formatarDataFiltro(filters.data) })
        : null;

    const handleSolicitarReserva = (espacoId: string) => {
        router.get(route('espacos.show', espacoId), filters.data ? { semana: filters.data } : {});
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('espacos.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
                <GenericHeader titulo={t('espacos.consultar_espacos')} descricao={t('espacos.consultar_espacos_desc')} />

                <EspacoFiltroBusca
                    route={route('espacos.index')}
                    unidades={unidades}
                    modulos={modulos}
                    andares={andares}
                    filters={filters}
                    disponibilidade
                />

                {espacos.length > 0 ? (
                    <>
                        {resumoDisponibilidade && <p className="text-muted-foreground -mt-2 text-sm">{resumoDisponibilidade}</p>}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                            {espacos.map((espaco) => (
                                <EspacoCard
                                    key={espaco.id}
                                    espaco={espaco}
                                    user={user}
                                    handleSolicitarReserva={handleSolicitarReserva}
                                    semanaDestino={filters.data}
                                />
                            ))}
                        </div>

                        <PaginacaoListas links={links} only={['espacos', 'filters']} />
                    </>
                ) : (
                    <EmptyState
                        icon={SearchX}
                        title={t('espacos.empty.title')}
                        description={t('espacos.empty.desc')}
                        action={
                            hasActiveFilters && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        router.get(route('espacos.index'));
                                    }}
                                    className="gap-1.5"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {t('espacos.limpar_filtros')}
                                </Button>
                            )
                        }
                    />
                )}
            </div>
        </AppLayout>
    );
}
