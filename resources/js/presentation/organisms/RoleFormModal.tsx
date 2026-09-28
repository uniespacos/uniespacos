import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getGroupLabel, getPermissionLabel } from '@/constants/permission-labels';
import { FormField } from '@/presentation/molecules/FormField';
import { Modal } from '@/presentation/molecules/Modal';
import type { Permission, Role } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

const roleFormSchema = z.object({
    name: z
        .string()
        .min(1, 'Nome é obrigatório')
        .max(50, 'Nome deve ter no máximo 50 caracteres')
        .regex(/^[a-z][a-z0-9-]*$/, 'Use apenas letras minúsculas, números e hífens (ex: secretaria-academica). Deve começar com letra.'),
    description: z.string().max(500, 'Descrição deve ter no máximo 500 caracteres').optional(),
    permissions: z.array(z.string()).optional(),
});

type RoleFormData = z.infer<typeof roleFormSchema>;

interface RoleFormModalProps {
    isOpen: boolean;
    role?: Role | null;
    permissions: Record<string, Permission[]>;
    onClose: () => void;
}

function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}

export function RoleFormModal({ isOpen, role, permissions, onClose }: RoleFormModalProps) {
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        watch,
        setValue,
    } = useForm<RoleFormData>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: '',
            description: '',
            permissions: [],
        },
    });

    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const permissionsValue = watch('permissions');
    const selectedPermissions = useMemo(() => permissionsValue ?? [], [permissionsValue]);
    const nameValue = watch('name');

    useEffect(() => {
        if (role) {
            reset({
                name: role.name,
                description: role.description ?? '',
                permissions: role.permissions ?? [],
            });
        } else {
            reset({
                name: '',
                description: '',
                permissions: [],
            });
        }
    }, [role, reset]);

    const handleTogglePermission = (permissionName: string) => {
        const current = selectedPermissions;
        const updated = current.includes(permissionName) ? current.filter((p) => p !== permissionName) : [...current, permissionName];
        setValue('permissions', updated, { shouldValidate: true });
    };

    const handleToggleGroup = (group: string, groupPerms: Permission[]) => {
        const groupPermNames = groupPerms.map((p) => p.name);
        const allSelected = groupPermNames.every((p) => selectedPermissions.includes(p));

        const updated = allSelected
            ? selectedPermissions.filter((p) => !groupPermNames.includes(p))
            : Array.from(new Set([...selectedPermissions, ...groupPermNames]));

        setValue('permissions', updated, { shouldValidate: true });
    };

    const groupStats = useMemo(() => {
        const stats: Record<string, { selected: number; total: number }> = {};
        Object.entries(permissions).forEach(([group, perms]) => {
            stats[group] = {
                total: perms.length,
                selected: perms.filter((p) => selectedPermissions.includes(p.name)).length,
            };
        });
        return stats;
    }, [permissions, selectedPermissions]);

    const onSubmit = (data: RoleFormData) => {
        if (role) {
            router.put(route('institucional.roles.update', role.id), data, {
                onSuccess: onClose,
            });
        } else {
            router.post(route('institucional.roles.store'), data, {
                onSuccess: onClose,
            });
        }
    };

    const slugSuggestion = nameValue && !/^[a-z][a-z0-9-]*$/.test(nameValue) ? slugify(nameValue) : null;

    return (
        <Modal
            open={isOpen}
            onOpenChange={onClose}
            size="xl"
            className="max-h-[90vh] max-w-5xl overflow-y-auto"
            title={role ? 'Editar Papel' : 'Criar Novo Papel'}
            description={role ? 'Atualize os detalhes do papel' : 'Crie um novo papel customizado'}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-5">
                    <FormField label="Nome (identificador técnico)" htmlFor="name" error={errors.name?.message}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => <Input id="name" {...field} placeholder="ex: secretaria-academica" disabled={role?.is_system} />}
                        />
                        {slugSuggestion && !errors.name?.message?.includes('obrigatório') && (
                            <button
                                type="button"
                                onClick={() => {
                                    setValue('name', slugSuggestion, { shouldValidate: true });
                                }}
                                className="text-info-accent mt-1 text-sm hover:underline"
                            >
                                Usar sugestão: <strong>{slugSuggestion}</strong>
                            </button>
                        )}
                    </FormField>

                    <FormField label="Descrição (opcional)" htmlFor="description" error={errors.description?.message}>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => <Textarea id="description" {...field} placeholder="Para que serve esse papel..." rows={3} />}
                        />
                    </FormField>
                </div>

                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <Label className="text-base">Permissões</Label>
                        <Badge variant="secondary">{selectedPermissions.length} selecionadas</Badge>
                    </div>

                    <div className="space-y-2">
                        {Object.entries(permissions).map(([group, perms]) => {
                            const stats = groupStats[group];
                            const allSelected = stats.selected === stats.total;
                            const someSelected = stats.selected > 0 && !allSelected;
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
                                    <div className="hover:bg-muted/50 flex items-center justify-between p-3">
                                        <div className="flex flex-1 items-center gap-3">
                                            <Checkbox
                                                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                                onCheckedChange={() => {
                                                    handleToggleGroup(group, perms);
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}
                                            />
                                            <CollapsibleTrigger className="flex flex-1 items-center gap-2 text-left">
                                                <span className="font-medium">{getGroupLabel(group)}</span>
                                                <Badge variant={allSelected ? 'default' : 'outline'} className="text-xs">
                                                    {stats.selected}/{stats.total}
                                                </Badge>
                                                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            </CollapsibleTrigger>
                                        </div>
                                    </div>

                                    <CollapsibleContent>
                                        <div className="bg-muted/20 space-y-2 border-t p-3">
                                            {perms.map((perm) => (
                                                <Label
                                                    key={perm.name}
                                                    className="hover:bg-background text-foreground flex cursor-pointer items-start gap-3 rounded p-2 leading-normal font-normal select-none"
                                                >
                                                    <Checkbox
                                                        checked={selectedPermissions.includes(perm.name)}
                                                        onCheckedChange={() => {
                                                            handleTogglePermission(perm.name);
                                                        }}
                                                        className="mt-0.5"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm">{getPermissionLabel(perm.name)}</div>
                                                        <div className="text-muted-foreground font-mono text-xs">{perm.name}</div>
                                                    </div>
                                                </Label>
                                            ))}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {role ? 'Atualizar' : 'Criar'} Papel
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
