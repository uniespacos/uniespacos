import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { ColumnDef, DataTable } from '@/presentation/molecules/DataTable';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { DeleteRoleConfirmation } from '@/presentation/organisms/DeleteRoleConfirmation';
import { RoleFormModal } from '@/presentation/organisms/RoleFormModal';
import AppLayout from '@/presentation/templates/AppLayout';
import type { Permission, Role } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Edit, MoreHorizontal, Plus, Shield, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Papéis',
        href: '/institucional/roles',
    },
];

export default function RolesPage() {
    const { t } = useTranslation();
    const { roles, permissions } = usePage<{
        roles: Role[];
        permissions: Record<string, Permission[]>;
    }>().props;

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [showFormModal, setShowFormModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const filteredRoles = useMemo(() => {
        return roles.filter((role) => {
            const matchesSearch =
                role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (role.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

            if (typeFilter === 'system') return matchesSearch && role.is_system;
            if (typeFilter === 'custom') return matchesSearch && !role.is_system;
            return matchesSearch;
        });
    }, [roles, searchTerm, typeFilter]);

    const handleEdit = (role: Role) => {
        setSelectedRole(role);
        setShowFormModal(true);
    };

    const handleDelete = (role: Role) => {
        setSelectedRole(role);
        setShowDeleteModal(true);
    };

    const handleCreateNew = () => {
        setSelectedRole(null);
        setShowFormModal(true);
    };

    const closeFormModal = () => {
        setShowFormModal(false);
        setSelectedRole(null);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setSelectedRole(null);
    };

    const renderRoleActions = (role: Role) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" aria-label={`Ações do papel ${role.name}`}>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => {
                        handleEdit(role);
                    }}
                >
                    <Edit className="mr-2 h-4 w-4" />
                    {t('common.actions.edit')}
                </DropdownMenuItem>
                {!role.is_system && (
                    <DropdownMenuItem
                        onClick={() => {
                            handleDelete(role);
                        }}
                        className="text-destructive-accent focus:text-destructive-accent"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common.actions.delete')}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const columns = useMemo<ColumnDef<Role>[]>(
        () => [
            {
                id: 'nome',
                header: t('admin.roles.titulo'),
                enableSorting: true,
                cell: (role) => (
                    <div className="flex items-center gap-2.5">
                        <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-md">
                            <Shield className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-foreground font-semibold">{role.name}</span>
                                {role.is_system && (
                                    <Badge variant="secondary" className="text-xs">
                                        Sistema
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                ),
            },
            {
                id: 'descricao',
                header: t('espacos.detalhes.descricao'),
                cell: (role) => <span className="text-muted-foreground text-sm">{role.description ?? t('common.empty.noData')}</span>,
            },
            {
                id: 'permissoes',
                header: t('usuarios.gerenciar.permissoes'),
                align: 'center',
                width: '120px',
                cell: (role) => (
                    <Badge variant="outline" className="text-xs">
                        {String(role.permissions_count ?? 0)} permissões
                    </Badge>
                ),
            },
            {
                id: 'usuarios',
                header: t('usuarios.titulo'),
                align: 'center',
                width: '120px',
                cell: (role) => <span className="text-foreground text-sm font-medium">{String(role.users_count ?? 0)}</span>,
            },
        ],
        [t],
    );

    const renderCard = (role: Role) => (
        <Card key={role.id} className="border-border transition-shadow hover:shadow-md">
            <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-foreground truncate text-base font-semibold">{role.name}</h3>
                            {role.is_system && (
                                <Badge variant="secondary" className="text-xs">
                                    Sistema
                                </Badge>
                            )}
                        </div>
                        {role.description && <p className="text-muted-foreground mt-1 text-xs">{role.description}</p>}
                    </div>
                    <div>{renderRoleActions(role)}</div>
                </div>
                <div className="text-muted-foreground flex gap-4 border-t pt-2 text-xs">
                    <span>
                        <strong className="text-foreground">{String(role.permissions_count ?? 0)}</strong> permissões
                    </span>
                    <span>
                        <strong className="text-foreground">{String(role.users_count ?? 0)}</strong> usuário(s)
                    </span>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.roles.titulo')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader
                    titulo={t('admin.roles.titulo')}
                    descricao={t('admin.roles.desc')}
                    buttonText={t('admin.roles.novo')}
                    ButtonIcon={Plus}
                    canSeeButton={true}
                    buttonOnClick={handleCreateNew}
                />

                <Card>
                    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-2">
                            <Label>{t('common.actions.search')}</Label>
                            <Input
                                placeholder={t('common.actions.search')}
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                }}
                            />
                        </div>

                        <div className="space-y-2 sm:w-[180px]">
                            <Label>{t('espacos.filtros.tipo')}</Label>
                            <Select
                                value={typeFilter}
                                onValueChange={(v) => {
                                    setTypeFilter(v as 'all' | 'system' | 'custom');
                                }}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('common.empty.noResults')}</SelectItem>
                                    <SelectItem value="system">Sistema</SelectItem>
                                    <SelectItem value="custom">Customizadas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <DataTable
                    data={filteredRoles}
                    columns={columns}
                    autoCardViewOnMobile={true}
                    enableColumnVisibility={true}
                    renderCard={renderCard}
                    gridClassName="grid gap-4 grid-cols-1"
                    emptyState={{
                        title: t('admin.roles.nenhum'),
                        description: t('common.empty.adjustFilter'),
                    }}
                    actions={renderRoleActions}
                />
            </div>

            <RoleFormModal isOpen={showFormModal} role={selectedRole} permissions={permissions} onClose={closeFormModal} />

            <DeleteRoleConfirmation isOpen={showDeleteModal} role={selectedRole} onClose={closeDeleteModal} />
        </AppLayout>
    );
}
