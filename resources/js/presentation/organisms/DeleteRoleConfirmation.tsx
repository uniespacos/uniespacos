import { ConfirmDeleteDialog } from '@/presentation/molecules/ConfirmDeleteDialog';
import type { Role } from '@/types';
import { router } from '@inertiajs/react';
import { useState } from 'react';

interface DeleteRoleConfirmationProps {
    isOpen: boolean;
    role: Role | null;
    onClose: () => void;
}

export function DeleteRoleConfirmation({ isOpen, role, onClose }: DeleteRoleConfirmationProps) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = () => {
        if (!role) return;

        setIsDeleting(true);
        router.delete(route('institucional.roles.destroy', role.id), {
            onSuccess: onClose,
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    return (
        <ConfirmDeleteDialog
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title="Deletar Papel"
            description={
                role?.is_system ? (
                    'Você não pode deletar um papel de sistema.'
                ) : (
                    <>
                        Tem certeza que deseja deletar o papel <strong>{role?.name}</strong>?
                        {(role?.users_count || 0) > 0 && (
                            <div className="border-warning-accent/30 bg-warning-subtle mt-2 rounded border p-2 text-sm">
                                <strong>{role?.users_count}</strong> usuário(s) será(ão) movido(s) para o papel 'comum'.
                            </div>
                        )}{' '}
                        Esta ação não pode ser desfeita.
                    </>
                )
            }
            onConfirm={handleDelete}
            isDeleting={isDeleting}
            confirmText="Deletar"
            disabled={role?.is_system}
            showCancel={!role?.is_system}
            closeText={role?.is_system ? 'Fechar' : undefined}
        />
    );
}
