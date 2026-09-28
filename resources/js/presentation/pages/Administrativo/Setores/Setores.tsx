import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { SearchFilter } from '@/presentation/molecules/SearchFilter';
import { ViewMode, ViewModeToggle } from '@/presentation/molecules/ViewModeToggle';
import { ModaisSetor } from '@/presentation/organisms/ModaisSetor';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Instituicao, Setor, Unidade } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Edit, MapPin, PlusCircle, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function SetoresPage() {
    const { t } = useTranslation();
    const { instituicao, unidades, setores, filters } = usePage<{
        instituicao: Instituicao;
        unidades: Unidade[];
        setores: {
            data: Setor[];
            links: { url: string | null; label: string; active: boolean }[];
            total: number;
        };
        filters?: { search: string | null; unidade_id: number | null };
    }>().props;

    const [selectedUnidade, setSelectedUnidade] = useState<string>(filters?.unidade_id ? String(filters.unidade_id) : 'all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
    const [viewingUsuarios, setViewingUsuarios] = useState<Setor | null>(null);
    const [removerSetor, setRemoverSetor] = useState<Setor | undefined>();
    const [viewMode, setViewMode] = useState<ViewMode>('table');

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.setores.titulo'),
                href: '/institucional/setores',
            },
        ],
        [t],
    );

    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: 'institucional.setors.index',
        initialSearch: filters?.search ?? '',
        extraParams: {
            unidade_id: selectedUnidade !== 'all' ? selectedUnidade : undefined,
        },
    });

    const handleUnidadeChange = (unidadeId: string) => {
        setSelectedUnidade(unidadeId);
        router.get(
            route('institucional.setors.index'),
            {
                search: searchTerm || undefined,
                unidade_id: unidadeId !== 'all' ? unidadeId : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedUnidade('all');
        router.get(
            route('institucional.setors.index'),
            {},
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const columns = useMemo<ColumnDef<Setor>[]>(
        () => [
            {
                id: 'setor',
                header: 'Setor',
                enableSorting: true,
                cell: (setor) => (
                    <div>
                        <div className="font-medium">{setor.nome}</div>
                        <div className="text-muted-foreground text-sm">Sigla: {setor.sigla}</div>
                    </div>
                ),
            },
            {
                id: 'unidade',
                header: 'Unidade',
                cell: (setor) => (
                    <div>
                        <div className="font-medium">{setor.unidade?.nome}</div>
                        <div className="text-muted-foreground text-sm">{setor.unidade?.sigla}</div>
                    </div>
                ),
            },
            {
                id: 'instituicao',
                header: 'Instituição',
                cell: (setor) => (
                    <div>
                        <div className="font-medium">{setor.unidade?.instituicao?.nome}</div>
                        <div className="text-muted-foreground text-sm">{setor.unidade?.instituicao?.sigla}</div>
                    </div>
                ),
            },
            {
                id: 'usuarios',
                header: 'Usuários',
                align: 'center',
                width: '110px',
                cell: (setor) => (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setViewingUsuarios(setor);
                        }}
                        className="flex items-center gap-1"
                        aria-label={`Ver usuários do setor ${setor.sigla}`}
                    >
                        <Users className="h-4 w-4" />
                        <Badge variant="secondary">{setor.users_count ?? 0}</Badge>
                    </Button>
                ),
            },
        ],
        [],
    );

    const renderCard = (setor: Setor) => (
        <Card key={setor.id} className="border-border transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-semibold">{setor.nome}</h4>
                        <p className="text-muted-foreground text-sm">Sigla: {setor.sigla}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setViewingUsuarios(setor);
                        }}
                        className="flex shrink-0 items-center gap-1"
                        aria-label={`Ver usuários do setor ${setor.sigla}`}
                    >
                        <Users className="h-4 w-4" />
                        <Badge variant="secondary">{setor.users_count ?? 0}</Badge>
                    </Button>
                </div>
                <div className="text-muted-foreground space-y-0.5 text-sm">
                    <p className="truncate">
                        Unidade: {setor.unidade?.nome} ({setor.unidade?.sigla})
                    </p>
                    <p className="truncate">Instituição: {setor.unidade?.instituicao?.sigla}</p>
                </div>
                <div className="flex justify-end gap-2 border-t pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setEditingSetor(setor);
                        }}
                        aria-label="Editar setor"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive-accent hover:text-destructive-accent"
                        onClick={() => {
                            setRemoverSetor(setor);
                        }}
                        aria-label="Excluir setor"
                    >
                        <Trash2 className="h-4 w-4 text-destructive-accent" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    const renderActions = (setor: Setor) => (
        <div className="flex justify-end gap-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                    setEditingSetor(setor);
                }}
                aria-label="Editar setor"
            >
                <Edit className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="text-destructive-accent hover:text-destructive-accent"
                onClick={() => {
                    setRemoverSetor(setor);
                }}
                aria-label="Excluir setor"
            >
                <Trash2 className="h-4 w-4 text-destructive-accent" />
            </Button>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.setores.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.setores.titulo')}
                    descricao={t('admin.setores.desc')}
                    canSeeButton
                    buttonText={t('admin.setores.novo')}
                    ButtonIcon={PlusCircle}
                    buttonOnClick={() => {
                        setIsCreateModalOpen(true);
                    }}
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
                        <div className="w-full flex-1">
                            <SearchFilter
                                searchTerm={searchTerm}
                                onSearchTermChange={setSearchTerm}
                                placeholder="Nome ou sigla do setor..."
                                variant="plain"
                            />
                        </div>
                        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-2 sm:w-[220px]">
                                <Label>Unidade</Label>
                                <Select value={selectedUnidade} onValueChange={handleUnidadeChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Todas as unidades" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as unidades</SelectItem>
                                        {unidades.map((unidade) => (
                                            <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="h-4 w-4" />
                                                    {unidade.nome}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {(searchTerm || selectedUnidade !== 'all') && (
                                <Button variant="outline" onClick={handleClearFilters} className="shrink-0">
                                    Limpar Filtros
                                </Button>
                            )}
                            <div className="shrink-0 self-end sm:self-auto">
                                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    data={setores.data}
                    columns={columns}
                    viewMode={viewMode}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    renderCard={renderCard}
                    gridClassName="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    cardTitle="Setores Cadastrados"
                    cardDescription={`${String(setores.data.length)} setor(es) encontrado(s)`}
                    cardHeaderAction={<ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />}
                    pagination={{ links: setores.links }}
                    emptyState={{
                        title: t('admin.setores.nenhum'),
                        description: 'Nenhum setor cadastrado para os filtros selecionados.',
                    }}
                    actions={renderActions}
                />

                <ModaisSetor
                    isCreateModalOpen={isCreateModalOpen}
                    setIsCreateModalOpen={setIsCreateModalOpen}
                    editingSetor={editingSetor}
                    setEditingSetor={setEditingSetor}
                    viewingUsuarios={viewingUsuarios}
                    setViewingUsuarios={setViewingUsuarios}
                    instituicao={instituicao}
                    unidades={unidades}
                />

                {removerSetor && (
                    <DeleteItem
                        itemName={removerSetor.sigla}
                        route={route('institucional.setors.destroy', { setor: removerSetor.id })}
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverSetor(undefined);
                            }
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}
