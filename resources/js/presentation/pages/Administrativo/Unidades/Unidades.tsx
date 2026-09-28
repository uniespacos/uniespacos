import { Button } from '@/components/ui/button';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { SearchFilter } from '@/presentation/molecules/SearchFilter';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Instituicao, Unidade } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { FilePenLine, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Unidades',
        href: '/institucional/unidades',
    },
];

const columns: ColumnDef<Unidade>[] = [
    { id: 'nome', header: 'Nome', accessorKey: 'nome', enableSorting: true },
    { id: 'sigla', header: 'Sigla', accessorKey: 'sigla', width: '120px', enableSorting: true },
    { id: 'instituicao', header: 'Instituição', cell: (unidade) => unidade.instituicao?.sigla ?? 'N/A' },
];

export default function UnidadesPage() {
    const { t } = useTranslation();
    const { unidades, filters } = usePage<{
        unidades: {
            data: Unidade[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        instituicoes: Instituicao[];
        filters?: { search: string | null };
    }>().props;

    const [removerUnidade, setRemoverUnidade] = useState<Unidade | null>(null);
    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: 'institucional.unidades.index',
        initialSearch: filters?.search ?? '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.unidades.titulo')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.unidades.titulo')}
                    descricao={t('admin.unidades.desc')}
                    buttonText={t('admin.unidades.novo')}
                    buttonLink={route('institucional.unidades.create')}
                    ButtonIcon={PlusCircle}
                    canSeeButton={true}
                />
                <SearchFilter searchTerm={searchTerm} onSearchTermChange={setSearchTerm} placeholder={t('common.actions.search')} variant="card" />
                <DataTable
                    data={unidades.data}
                    columns={columns}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    pagination={{ links: unidades.links }}
                    emptyState={{
                        title: t('admin.unidades.nenhuma'),
                        description: t('common.empty.adjustFilter'),
                    }}
                    actions={(unidade) => (
                        <div className="flex justify-end gap-2">
                            <Link href={route('institucional.unidades.edit', { unidade: unidade.id })}>
                                <Button variant="outline" size="icon" aria-label={t('common.actions.edit')}>
                                    <FilePenLine className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive-accent hover:text-destructive-accent"
                                onClick={() => {
                                    setRemoverUnidade(unidade);
                                }}
                                aria-label={t('common.actions.delete')}
                            >
                                <Trash2 className="h-4 w-4 text-destructive-accent" />
                            </Button>
                        </div>
                    )}
                />
                {removerUnidade && (
                    <DeleteItem
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverUnidade(null);
                            }
                        }}
                        itemName={removerUnidade.nome}
                        route={route('institucional.unidades.destroy', removerUnidade.id)}
                    />
                )}
            </div>
        </AppLayout>
    );
}
