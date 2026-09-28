import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_COMUM } from '@/constants/permissions';
import { getRoleBadgeClass, getRoleLabel } from '@/constants/role-labels';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import DeleteItem from '@/presentation/molecules/DeleteItem';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { SearchFilter } from '@/presentation/molecules/SearchFilter';
import { ViewMode, ViewModeToggle } from '@/presentation/molecules/ViewModeToggle';
import { EditUserModal } from '@/presentation/organisms/EditUserModal';
import { PermissionModal } from '@/presentation/organisms/PermissionModal';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Setor, User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Edit, Key, MoreHorizontal, Trash2, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Usuários',
        href: '/institucional/usuarios',
    },
];

export default function UsuariosPage() {
    const { t } = useTranslation();
    const { users, setores, filters } = usePage<{
        users: {
            data: User[];
            links: { url: string | null; label: string; active: boolean }[];
            meta: object;
        };
        setores: Setor[];
        filters?: { search: string | null; setor_id: string | null };
    }>().props;

    const [selectedUser, setSelectedUser] = useState<User | undefined>();
    const [editingUser, setEditingUser] = useState<User | undefined>();
    const [removerUsuario, setRemoverUsuario] = useState<User | undefined>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedSetorId, setSelectedSetorId] = useState<string>(filters?.setor_id ?? 'all');
    const [viewMode, setViewMode] = useState<ViewMode>('table');

    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: 'institucional.usuarios.index',
        initialSearch: filters?.search ?? '',
        extraParams: {
            setor_id: selectedSetorId !== 'all' ? selectedSetorId : undefined,
        },
    });

    const handleSetorChange = (setorId: string) => {
        setSelectedSetorId(setorId);
        router.get(
            route('institucional.usuarios.index'),
            {
                search: searchTerm || undefined,
                setor_id: setorId !== 'all' ? setorId : undefined,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const handleOpenPermissionModal = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
    };

    const handlePermissionUpdate = (userId: number, roleName: string, agendas?: number[], directPermissions?: string[]) => {
        setProcessing(true);
        const payload: { role_name: string; agendas: number[]; direct_permissions?: string[] } = {
            role_name: roleName,
            agendas: agendas ?? [],
        };
        if (directPermissions !== undefined) {
            payload.direct_permissions = directPermissions;
        }
        router.put(route('institucional.usuarios.updatepermissions', { user: userId }), payload, {
            onSuccess: () => {
                setIsModalOpen(false);
                setSelectedUser(undefined);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const renderUserActions = (user: User) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { handleOpenEditModal(user); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { handleOpenPermissionModal(user); }}>
                    <Key className="mr-2 h-4 w-4" />
                    Permissões
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="text-destructive-accent focus:text-destructive-accent"
                    onClick={() => {
                        setRemoverUsuario(user);
                    }}
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const columns: ColumnDef<User>[] = useMemo(
        () => [
            {
                id: 'usuario',
                header: t('usuarios.colunas.nome'),
                cell: (user) => (
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>
                                {user.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="truncate font-medium">{user.name}</div>
                            <div className="text-muted-foreground truncate text-sm">{user.email}</div>
                            {user.telefone ? <div className="text-muted-foreground text-xs">{user.telefone}</div> : null}
                        </div>
                    </div>
                ),
            },
            {
                id: 'setor',
                header: t('usuarios.colunas.setor'),
                cell: (user) => user.setor?.sigla ?? 'N/A',
            },
            {
                id: 'papel',
                header: t('usuarios.colunas.perfil'),
                cell: (user) => <Badge className={getRoleBadgeClass(user.roles[0] ?? ROLE_COMUM)}>{getRoleLabel(user.roles[0] ?? ROLE_COMUM)}</Badge>,
            },
            {
                id: 'status',
                header: t('usuarios.colunas.status'),
                cell: (user) => (
                    <div className="flex items-center space-x-2">
                        <div className={cn('h-2 w-2 shrink-0 rounded-full', user.email_verified_at ? 'bg-success' : 'bg-destructive')} />
                        <span className="text-muted-foreground text-xs whitespace-nowrap">
                            {user.email_verified_at ? t('common.status.verified') : t('common.status.notVerified')}
                        </span>
                    </div>
                ),
            },
        ],
        [t],
    );

    const renderUserCard = (user: User) => (
        <Card key={user.id} className="border-border transition-shadow hover:shadow-md">
            <CardContent className="space-y-4 p-4">
                <div className="flex items-center space-x-3">
                    <Avatar className="h-11 w-11 shrink-0">
                        <AvatarFallback>
                            {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-base font-semibold">{user.name}</h3>
                        <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                        {user.telefone ? <p className="text-muted-foreground text-xs">{user.telefone}</p> : null}
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <div className="flex items-center gap-2">
                        <Badge className={getRoleBadgeClass(user.roles[0] ?? ROLE_COMUM)}>{getRoleLabel(user.roles[0] ?? ROLE_COMUM)}</Badge>
                        <div className="flex items-center space-x-1.5">
                            <div className={cn('h-2 w-2 rounded-full', user.email_verified_at ? 'bg-success' : 'bg-destructive')} />
                            <span className="text-muted-foreground text-xs">{user.email_verified_at ? t('common.status.verified') : t('common.status.notVerified')}</span>
                        </div>
                    </div>
                    <div>{renderUserActions(user)}</div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('usuarios.gerenciar_usuarios')} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('usuarios.gerenciar_usuarios')}
                    descricao={t('usuarios.gerenciar_usuarios_desc')}
                    buttonText="Novo Usuário"
                    ButtonIcon={UserPlus}
                    canSeeButton={false}
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-end">
                        <div className="w-full flex-1">
                            <SearchFilter
                                searchTerm={searchTerm}
                                onSearchTermChange={setSearchTerm}
                                placeholder={t('usuarios.buscar_placeholder')}
                                variant="plain"
                            />
                        </div>
                        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1 space-y-2 sm:w-[180px]">
                                <Label>Setor</Label>
                                <Select value={selectedSetorId} onValueChange={handleSetorChange}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Setor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">{t('usuarios.todos_setores')}</SelectItem>
                                        {setores.map((setor) => (
                                            <SelectItem key={setor.id} value={setor.id.toString()}>
                                                {setor.sigla}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="shrink-0 self-end sm:self-auto">
                                <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    data={users.data}
                    columns={columns}
                    viewMode={viewMode}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    renderCard={renderUserCard}
                    gridClassName="grid gap-4 grid-cols-1"
                    pagination={{ links: users.links }}
                    emptyState={{
                        title: t('usuarios.nenhum_usuario'),
                        description: t('usuarios.ajustar_busca'),
                    }}
                    actions={renderUserActions}
                />

                {removerUsuario && (
                    <DeleteItem
                        itemName={removerUsuario.name}
                        isOpen={(open) => {
                            if (!open) {
                                setRemoverUsuario(undefined);
                            }
                        }}
                        route={route('institucional.usuarios.destroy', { usuario: removerUsuario.id })}
                    />
                )}

                <EditUserModal
                    user={editingUser}
                    isOpen={Boolean(editingUser)}
                    onClose={() => {
                        setEditingUser(undefined);
                    }}
                />

                {isModalOpen && selectedUser && (
                    <PermissionModal
                        key={selectedUser.id}
                        user={selectedUser}
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedUser(undefined);
                        }}
                        onUpdate={handlePermissionUpdate}
                        processing={processing}
                    />
                )}
            </div>
        </AppLayout>
    );
}
