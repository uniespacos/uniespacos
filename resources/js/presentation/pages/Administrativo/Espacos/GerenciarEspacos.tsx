import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/i18n';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { ViewMode, ViewModeToggle } from '@/presentation/molecules/ViewModeToggle';
import EspacoFiltroBusca from '@/presentation/organisms/EspacoFiltroBusca';
import { GerenciarGestoresModal } from '@/presentation/organisms/GerenciarGestoresModal';
import { GestoresEspaco } from '@/presentation/organisms/GestoresEspaco';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Andar, Espaco, Modulo, Unidade, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Edit, MoreHorizontal, PlusCircle, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function GerenciarEspacos() {
    const { t } = useTranslation();
    const { unidades, modulos, andares, espacos, users, filters, capacidadeEspacos } = usePage<{
        espacos: {
            data: Espaco[];
            links: { url: string | null; label: string; active: boolean }[];
            total: number;
        };
        unidades: Unidade[];
        modulos: Modulo[];
        andares: Andar[];
        users: User[];
        filters: {
            search?: string;
            unidade?: string;
            modulo?: string;
            andar?: string;
            capacidade?: string;
        };
        capacidadeEspacos: number[];
    }>().props;

    const [espacoParaGerenciar, setEspacoParaGerenciar] = useState<Espaco | null>(null);
    const [removerEspaco, setRemoverEspaco] = useState<Espaco | undefined>(undefined);
    const [viewMode, setViewMode] = useState<ViewMode>('table');

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.espacos.titulo'),
                href: '/institucional/espacos',
            },
        ],
        [t],
    );

    const handleCadastrarEspaco = () => {
        router.get(route('institucional.espacos.create'));
    };

    const handleGerenciarGestores = (espaco: Espaco) => {
        setEspacoParaGerenciar(espaco);
    };

    const handleSalvarGestores = (espacoId: number, gestores: Record<string, number | null>) => {
        router.patch(route('institucional.espacos.alterarGestores', espacoId), { gestores });
    };

    const renderEspacoActions = (espaco: Espaco) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label={`Ações para o espaço ${espaco.nome}`}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => {
                        router.get(route('institucional.espacos.edit', { espaco: espaco.id }));
                    }}
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => {
                        handleGerenciarGestores(espaco);
                    }}
                >
                    <Users className="mr-2 h-4 w-4" />
                    Gerenciar Gestores
                </DropdownMenuItem>
                <Separator />
                <DropdownMenuItem
                    onClick={() => {
                        setRemoverEspaco(espaco);
                    }}
                    className="text-destructive-accent"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const columns = useMemo<ColumnDef<Espaco>[]>(
        () => [
            {
                id: 'nome',
                header: 'Espaço',
                enableSorting: true,
                cell: (espaco) => (
                    <div>
                        <div className="font-medium">{espaco.nome}</div>
                        <div className="text-muted-foreground max-w-[200px] truncate text-sm">{espaco.descricao}</div>
                    </div>
                ),
            },
            {
                id: 'localizacao',
                header: 'Localização',
                cell: (espaco) => (
                    <div className="text-sm">
                        <div className="font-medium">{espaco.andar?.modulo?.unidade?.instituicao?.sigla}</div>
                        <div>{espaco.andar?.modulo?.unidade?.nome}</div>
                        <div className="text-muted-foreground">
                            {espaco.andar?.modulo?.nome} - {espaco.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : null}
                        </div>
                    </div>
                ),
            },
            {
                id: 'capacidade',
                header: 'Capacidade',
                cell: (espaco) => <Badge variant="secondary">{espaco.capacidade_pessoas} pessoas</Badge>,
            },
            {
                id: 'gestores',
                header: 'Gestores por Turno',
                cell: (espaco) => <GestoresEspaco agendas={espaco.agendas} />,
            },
        ],
        [],
    );

    const renderCard = (espaco: Espaco) => (
        <Card key={espaco.id} className="border-border transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h4 className="truncate text-base font-semibold">{espaco.nome}</h4>
                        <p className="text-muted-foreground line-clamp-2 text-sm">{espaco.descricao}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                        {espaco.capacidade_pessoas} pessoas
                    </Badge>
                </div>
                <div className="text-muted-foreground space-y-0.5 text-sm">
                    <p className="truncate">
                        {espaco.andar?.modulo?.unidade?.instituicao?.sigla} - {espaco.andar?.modulo?.unidade?.nome}
                    </p>
                    <p className="truncate">
                        {espaco.andar?.modulo?.nome} - {espaco.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : null}
                    </p>
                </div>
                <div className="border-t pt-2">
                    <GestoresEspaco agendas={espaco.agendas} />
                </div>
                <div className="flex justify-end border-t pt-2">{renderEspacoActions(espaco)}</div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.espacos.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.espacos.titulo')}
                    descricao={t('admin.espacos.desc')}
                    buttonText={t('admin.espacos.novo')}
                    ButtonIcon={PlusCircle}
                    buttonOnClick={handleCadastrarEspaco}
                    canSeeButton
                />

                <EspacoFiltroBusca
                    route={route('institucional.espacos.index')}
                    unidades={unidades}
                    modulos={modulos}
                    andares={andares}
                    filters={filters}
                    capacidadeEspacos={capacidadeEspacos}
                />

                <DataTable
                    data={espacos.data}
                    columns={columns}
                    viewMode={viewMode}
                    renderCard={renderCard}
                    gridClassName="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                    cardTitle={`Espaços Cadastrados (${String(espacos.total)})`}
                    cardHeaderAction={<ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />}
                    pagination={{ links: espacos.links }}
                    emptyState={{
                        title: 'Nenhum espaço encontrado',
                        description: 'Tente ajustar os filtros ou cadastre um novo espaço para que ele apareça aqui.',
                        action: (
                            <Button onClick={handleCadastrarEspaco}>
                                Cadastrar Primeiro Espaço
                            </Button>
                        ),
                    }}
                    actions={renderEspacoActions}
                />

                {espacoParaGerenciar && (
                    <GerenciarGestoresModal
                        key={espacoParaGerenciar.id}
                        espaco={espacoParaGerenciar}
                        usuarios={users}
                        isOpen={Boolean(espacoParaGerenciar)}
                        onClose={() => {
                            setEspacoParaGerenciar(null);
                        }}
                        onSave={handleSalvarGestores}
                    />
                )}

                {removerEspaco && (
                    <DeleteItem
                        showHeading={false}
                        itemName={removerEspaco.nome}
                        route={route('institucional.espacos.destroy', { espaco: removerEspaco.id })}
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverEspaco(undefined);
                            }
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}
