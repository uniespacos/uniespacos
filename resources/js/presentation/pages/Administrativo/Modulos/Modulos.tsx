import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { SearchFilter } from '@/presentation/molecules/SearchFilter';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Modulo, Unidade } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building, ChevronDown, ChevronRight, Edit, Layers, PlusCircle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Módulos',
        href: '/institucional/modulos',
    },
];

const tiposAcessoColors: Record<string, string | undefined> = {
    Livre: 'bg-success-subtle text-success-accent border-success-accent/30',
    Restrito: 'bg-warning-subtle text-warning-accent border-warning-accent/30',
    Controlado: 'bg-destructive-subtle text-destructive-accent border-destructive-accent/30',
};

const nivelLabels: Record<number, string | undefined> = {
    0: 'Térreo',
    1: '1º Andar',
    2: '2º Andar',
    3: '3º Andar',
    4: '4º Andar',
    5: '5º Andar',
    '-1': 'Subsolo',
    '-2': '2º Subsolo',
};

function nomeParaNivel(nome: string): number {
    if (nome === 'terreo') return 0;
    if (nome === 'subsolo') return -1;
    const match = /(\d+)/.exec(nome);
    if (match?.[1]) {
        return parseInt(match[1], 10);
    }
    return 0;
}

function nivelParaLabel(nivel: number): string {
    return nivelLabels[nivel] ?? `${String(nivel)}º Andar`;
}

export default function Modulos() {
    const { t } = useTranslation();
    const { modulos, unidades, filters } = usePage<{
        modulos: {
            data: Modulo[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        unidades: Unidade[];
        filters?: { search: string | null; unidade_id: string | null };
    }>().props;

    const [selectedUnidade, setSelectedUnidade] = useState<string>(filters?.unidade_id ?? 'all');
    const [expandedModulos, setExpandedModulos] = useState<Record<number, boolean>>({});
    const [removerModulo, setRemoverModulo] = useState<Modulo | null>(null);

    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: 'institucional.modulos.index',
        initialSearch: filters?.search ?? '',
        extraParams: {
            unidade_id: selectedUnidade !== 'all' ? selectedUnidade : '',
        },
    });

    const toggleModulo = (moduloId: number) => {
        setExpandedModulos((prev) => ({
            ...prev,
            [moduloId]: !prev[moduloId],
        }));
    };

    const handleUnidadeChange = (unidadeId: string) => {
        setSelectedUnidade(unidadeId);
        router.get(
            route('institucional.modulos.index'),
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

    const columns = useMemo<ColumnDef<Modulo>[]>(
        () => [
            {
                id: 'modulo',
                header: t('admin.modulos.titulo'),
                enableSorting: true,
                cell: (modulo) => (
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-lg">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-foreground font-semibold">{modulo.nome}</div>
                            <div className="text-muted-foreground text-xs">{String(modulo.andars?.length ?? 0)} andar(es)</div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'unidade',
                header: t('admin.unidades.titulo'),
                cell: (modulo) => (
                    <div className="flex items-center gap-2">
                        <Building className="text-muted-foreground h-4 w-4" />
                        <span>{modulo.unidade?.nome ?? 'N/A'}</span>
                        {modulo.unidade?.sigla && (
                            <Badge variant="secondary" className="text-xs">
                                {modulo.unidade.sigla}
                            </Badge>
                        )}
                    </div>
                ),
            },
            {
                id: 'instituicao',
                header: t('admin.instituicoes.titulo'),
                cell: (modulo) => <span className="text-sm font-medium">{modulo.unidade?.instituicao?.sigla ?? 'N/A'}</span>,
            },
            {
                id: 'andares',
                header: t('espacos.filtros.andar'),
                cell: (modulo) => (
                    <div className="flex flex-wrap gap-1">
                        {modulo.andars && modulo.andars.length > 0 ? (
                            modulo.andars.slice(0, 3).map((andar) => (
                                <Badge key={andar.id} variant="outline" className="text-xs">
                                    {nivelParaLabel(nomeParaNivel(andar.nome))}
                                </Badge>
                            ))
                        ) : (
                            <span className="text-muted-foreground text-xs">{t('common.empty.noRecords')}</span>
                        )}
                        {modulo.andars && modulo.andars.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                                +{String(modulo.andars.length - 3)}
                            </Badge>
                        )}
                    </div>
                ),
            },
        ],
        [t],
    );

    const renderCard = (modulo: Modulo) => {
        const isExpanded = expandedModulos[modulo.id] ?? false;
        return (
            <Card key={modulo.id} className="border-border transition-shadow hover:shadow-md">
                <Collapsible
                    open={isExpanded}
                    onOpenChange={() => {
                        toggleModulo(modulo.id);
                    }}
                >
                    <CollapsibleTrigger asChild>
                        <CardHeader className="hover:bg-muted/50 cursor-pointer p-4 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 flex-1 items-center space-x-3">
                                    <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                                        <Layers className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="text-foreground truncate text-base font-semibold">{modulo.nome}</CardTitle>
                                        <div className="text-muted-foreground mt-0.5 flex items-center space-x-2 text-xs">
                                            <span className="truncate">{modulo.unidade?.nome ?? 'Sem unidade'}</span>
                                            {modulo.unidade?.sigla && (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {modulo.unidade.sigla}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                        {String(modulo.andars?.length ?? 0)} andar(es)
                                    </Badge>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <CardContent className="border-border space-y-4 border-t p-4 pt-3">
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <h4 className="text-foreground text-sm font-medium">Andares do Módulo</h4>
                                    <span className="text-muted-foreground text-xs">{String(modulo.andars?.length ?? 0)} cadastrado(s)</span>
                                </div>

                                {modulo.andars && modulo.andars.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                        {modulo.andars
                                            .slice()
                                            .sort((a, b) => nomeParaNivel(a.nome) - nomeParaNivel(b.nome))
                                            .map((andar) => (
                                                <div
                                                    key={andar.id}
                                                    className="bg-card flex items-center justify-between gap-2 rounded-md border p-2.5 text-xs"
                                                >
                                                    <div>
                                                        <div className="text-foreground font-medium">
                                                            {nivelParaLabel(nomeParaNivel(andar.nome))}
                                                        </div>
                                                        <div className="text-muted-foreground">Nível: {String(nomeParaNivel(andar.nome))}</div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {andar.tipo_acesso.map((tipo) => (
                                                            <Badge
                                                                key={tipo}
                                                                variant="outline"
                                                                className={tiposAcessoColors[tipo] ?? 'bg-muted text-foreground'}
                                                            >
                                                                {tipo}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-xs">{t('common.empty.noRecords')}</p>
                                )}
                            </div>
                        </CardContent>
                    </CollapsibleContent>
                </Collapsible>
            </Card>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.modulos.titulo')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.modulos.titulo')}
                    descricao={t('admin.modulos.desc')}
                    buttonText={t('admin.modulos.novo')}
                    buttonLink={route('institucional.modulos.create')}
                    ButtonIcon={PlusCircle}
                    canSeeButton={true}
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
                        <div className="w-full flex-1">
                            <SearchFilter
                                searchTerm={searchTerm}
                                onSearchTermChange={setSearchTerm}
                                placeholder={t('common.actions.search')}
                                variant="plain"
                            />
                        </div>

                        <div className="space-y-2 sm:w-[220px]">
                            <Label>{t('espacos.filtros.unidade')}</Label>
                            <Select value={selectedUnidade} onValueChange={handleUnidadeChange}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('espacos.filtros.unidade')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.empty.noResults')}</SelectItem>
                                    {unidades.map((unidade) => (
                                        <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                            {unidade.nome} ({unidade.sigla})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    data={modulos.data}
                    columns={columns}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    renderCard={renderCard}
                    gridClassName="grid gap-4 grid-cols-1"
                    pagination={{ links: modulos.links }}
                    emptyState={{
                        title: t('admin.modulos.nenhum'),
                        description: t('common.empty.adjustFilter'),
                    }}
                    actions={(modulo) => (
                        <div className="flex justify-end gap-2">
                            <Link href={route('institucional.modulos.edit', { modulo: modulo.id })}>
                                <Button variant="outline" size="sm" className="gap-1 text-xs">
                                    <Edit className="h-3 w-3" />
                                    {t('common.actions.edit')}
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRemoverModulo(modulo);
                                }}
                                className="gap-1 text-xs text-destructive-accent hover:text-destructive-accent"
                            >
                                <Trash2 className="h-3 w-3 text-destructive-accent" />
                                {t('common.actions.delete')}
                            </Button>
                        </div>
                    )}
                />

                {removerModulo && (
                    <DeleteItem
                        itemName={removerModulo.nome}
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverModulo(null);
                            }
                        }}
                        route={route('institucional.modulos.destroy', { modulo: removerModulo.id })}
                    />
                )}
            </div>
        </AppLayout>
    );
}
