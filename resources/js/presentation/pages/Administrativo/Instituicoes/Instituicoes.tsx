import { Button } from '@/components/ui/button';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { SearchFilter } from '@/presentation/molecules/SearchFilter';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Instituicao } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { FilePenLine, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Instituições',
        href: '/institucional/instituicoes',
    },
];

const columns: ColumnDef<Instituicao>[] = [
    { id: 'nome', header: 'Nome', accessorKey: 'nome', enableSorting: true },
    { id: 'sigla', header: 'Sigla', accessorKey: 'sigla', width: '120px', enableSorting: true },
    { id: 'endereco', header: 'Endereço', accessorKey: 'endereco' },
];

export default function InstituicoesPage() {
    const { t } = useTranslation();
    const { instituicoes, filters } = usePage<{
        instituicoes: {
            data: Instituicao[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        filters?: { search: string | null };
    }>().props;

    const [removerInstituicao, setRemoverInstituicao] = useState<Instituicao | null>(null);
    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: 'institucional.instituicoes.index',
        initialSearch: filters?.search ?? '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.instituicoes.titulo')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.instituicoes.titulo')}
                    descricao={t('admin.instituicoes.desc')}
                    buttonText={t('admin.instituicoes.novo')}
                    buttonLink={route('institucional.instituicoes.create')}
                    ButtonIcon={PlusCircle}
                    canSeeButton={true}
                />
                <SearchFilter searchTerm={searchTerm} onSearchTermChange={setSearchTerm} placeholder={t('common.actions.search')} variant="card" />
                <DataTable
                    data={instituicoes.data}
                    columns={columns}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    pagination={{ links: instituicoes.links }}
                    emptyState={{
                        title: t('admin.instituicoes.nenhuma'),
                        description: t('common.empty.adjustFilter'),
                    }}
                    actions={(instituicao) => (
                        <div className="flex justify-end gap-2">
                            <Link href={route('institucional.instituicoes.edit', { instituico: instituicao.id })}>
                                <Button variant="outline" size="icon" aria-label={t('common.actions.edit')}>
                                    <FilePenLine className="h-4 w-4" />
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive-accent hover:text-destructive-accent"
                                onClick={() => {
                                    setRemoverInstituicao(instituicao);
                                }}
                                aria-label={t('common.actions.delete')}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                />
                {removerInstituicao && (
                    <DeleteItem
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverInstituicao(null);
                            }
                        }}
                        itemName={removerInstituicao.nome}
                        route={route('institucional.instituicoes.destroy', removerInstituicao.id)}
                    />
                )}
            </div>
        </AppLayout>
    );
}
