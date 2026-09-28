import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getGroupLabel, getPermissionLabel } from '@/constants/permission-labels';
import { PERMISSION_USUARIOS_GERENCIAR_PERMISSOES_DIRETAS, ROLE_COMUM, ROLE_GESTOR, ROLE_INSTITUCIONAL } from '@/constants/permissions';
import { hasPermission } from '@/lib/auth';
import { Modal } from '@/presentation/molecules/Modal';
import FiltroBuscaPermission from '@/presentation/organisms/FiltroBuscaPermission';
import { Instituicao, Permission, SelectedAgenda, User } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
    { value: ROLE_INSTITUCIONAL, label: 'Institucional' },
    { value: ROLE_GESTOR, label: 'Gestor' },
    { value: ROLE_COMUM, label: 'Comum' },
];

interface PermissionModalProps {
    user: User | undefined;
    isOpen: boolean;
    processing?: boolean;
    onClose: () => void;
    onUpdate: (userId: number, roleName: string, agendas?: number[], directPermissions?: string[]) => void;
}

interface PermissionContext {
    user: User;
    instituicoes: Instituicao[];
    permissionCatalog: Record<string, Permission[]>;
}

export function PermissionModal({ user, isOpen, onClose, onUpdate, processing = false }: PermissionModalProps) {
    const { props } = usePage<{ auth: { user: User } }>();
    const currentUser = props.auth.user;
    const canManageDirectPermissions = hasPermission(currentUser, PERMISSION_USUARIOS_GERENCIAR_PERMISSOES_DIRETAS);

    const [context, setContext] = useState<PermissionContext | null>(null);
    const [loading, setLoading] = useState(false);

    const [selectedRole, setSelectedRole] = useState<string>(ROLE_COMUM);
    const [selectedAgendas, setSelectedAgendas] = useState<SelectedAgenda[]>([]);
    const [directPermissions, setDirectPermissions] = useState<string[]>([]);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (!isOpen || !user) {
            setContext(null);
            return;
        }

        let cancelled = false;
        setLoading(true);

        fetch(route('institucional.usuarios.permission-context', { usuario: user.id }), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((response) => {
                if (!response.ok) throw new Error('Falha ao carregar as permissões do usuário.');
                return response.json() as Promise<PermissionContext>;
            })
            .then((data) => {
                if (cancelled) return;
                setContext(data);
                setSelectedRole(data.user.roles[0] ?? ROLE_COMUM);
                setDirectPermissions(data.user.direct_permissions ?? []);
                setSelectedAgendas(
                    (data.user.agendas ?? []).map(
                        (agenda) =>
                            ({
                                agenda: agenda,
                                espaco: agenda.espaco,
                                andar: agenda.espaco?.andar,
                                modulo: agenda.espaco?.andar?.modulo,
                                unidade: agenda.espaco?.andar?.modulo?.unidade,
                                instituicao: agenda.espaco?.andar?.modulo?.unidade?.instituicao,
                            }) as SelectedAgenda,
                    ),
                );
            })
            .catch(() => {
                if (!cancelled) toast.error('Não foi possível carregar as permissões deste usuário.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, user]);

    const handleTogglePermission = (permissionName: string) => {
        setDirectPermissions((prev) => (prev.includes(permissionName) ? prev.filter((p) => p !== permissionName) : [...prev, permissionName]));
    };

    const handleSubmit = () => {
        if (!user) return;

        const agendaIds = selectedAgendas.map((sa) => sa.agenda.id);
        onUpdate(user.id, selectedRole, agendaIds, canManageDirectPermissions ? directPermissions : undefined);
    };

    if (!user) return null;

    const inheritedPermissions = (context?.user.permissions ?? []).filter((p) => !directPermissions.includes(p));
    const permissionCatalog = context?.permissionCatalog ?? {};
    const instituicoes = context?.instituicoes ?? [];

    return (
        <Modal
            open={isOpen}
            onOpenChange={onClose}
            size="xl"
            className="max-h-[90vh] max-w-5xl overflow-y-auto"
            title={`Gerenciar Permissões - ${user.name}`}
            description="Defina o papel do usuário e, se necessário, conceda permissões diretas adicionais."
        >
            {loading || !context ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando permissões...
                </div>
            ) : (
                <Tabs defaultValue="role" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="role">Papel</TabsTrigger>
                        {canManageDirectPermissions && <TabsTrigger value="permissions">Permissões Diretas</TabsTrigger>}
                    </TabsList>

                    <TabsContent value="role" className="mt-6 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="permission-type">Papel do usuário</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o papel" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ROLE_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedRole === ROLE_GESTOR && (
                            <FiltroBuscaPermission
                                instituicoes={instituicoes}
                                selectedAgendas={selectedAgendas}
                                setSelectedAgendas={setSelectedAgendas}
                            />
                        )}

                        <div className="flex justify-end space-x-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubmit} disabled={processing}>
                                Salvar Permissões
                            </Button>
                        </div>
                    </TabsContent>

                    {canManageDirectPermissions && (
                        <TabsContent value="permissions" className="mt-6 space-y-6">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <Label className="text-base">Permissões Diretas</Label>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Permissões herdadas via papel aparecem desabilitadas. Marque para conceder permissões extras.
                                    </p>
                                </div>
                                <Badge variant="secondary">{directPermissions.length} diretas</Badge>
                            </div>

                            <div className="space-y-2">
                                {Object.entries(permissionCatalog).map(([group, perms]) => {
                                    const directInGroup = perms.filter((p) => directPermissions.includes(p.name)).length;
                                    const inheritedInGroup = perms.filter((p) => inheritedPermissions.includes(p.name)).length;
                                    const isOpen = openGroups[group] ?? false;

                                    return (
                                        <Collapsible
                                            key={group}
                                            open={isOpen}
                                            onOpenChange={(o) => {
                                                setOpenGroups((prev) => ({ ...prev, [group]: o }));
                                            }}
                                            className="rounded-md border"
                                        >
                                            <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-2 p-3 text-left">
                                                <span className="font-medium">{getGroupLabel(group)}</span>
                                                <Badge variant={directInGroup > 0 ? 'default' : 'outline'} className="text-xs">
                                                    {directInGroup} direta{directInGroup !== 1 ? 's' : ''}
                                                </Badge>
                                                {inheritedInGroup > 0 && (
                                                    <Badge variant="secondary" className="text-xs">
                                                        {inheritedInGroup} herdada{inheritedInGroup !== 1 ? 's' : ''}
                                                    </Badge>
                                                )}
                                                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <div className="bg-muted/20 space-y-2 border-t p-3">
                                                    {perms.map((perm) => {
                                                        const isInherited = inheritedPermissions.includes(perm.name);
                                                        const isDirect = directPermissions.includes(perm.name);

                                                        return (
                                                            <Label
                                                                key={perm.name}
                                                                className={`flex items-start gap-3 rounded p-2 ${isInherited ? 'opacity-60' : 'hover:bg-background cursor-pointer'} text-foreground leading-normal font-normal select-none`}
                                                            >
                                                                <Checkbox
                                                                    checked={isInherited || isDirect}
                                                                    disabled={isInherited}
                                                                    onCheckedChange={() => !isInherited && handleTogglePermission(perm.name)}
                                                                    className="mt-0.5"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        {getPermissionLabel(perm.name)}
                                                                        {isInherited && (
                                                                            <Badge variant="secondary" className="text-xs">
                                                                                herdada
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-muted-foreground font-mono text-xs">{perm.name}</div>
                                                                </div>
                                                            </Label>
                                                        );
                                                    })}
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end space-x-2 border-t pt-4">
                                <Button variant="outline" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button onClick={handleSubmit} disabled={processing}>
                                    Salvar Permissões
                                </Button>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            )}
        </Modal>
    );
}
