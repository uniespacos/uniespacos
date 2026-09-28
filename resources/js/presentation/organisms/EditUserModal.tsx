import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/presentation/molecules/FormField';
import { Modal } from '@/presentation/molecules/Modal';
import type { User } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { SyntheticEvent, useEffect, useState } from 'react';

interface EditUserModalProps {
    user: User | undefined;
    isOpen: boolean;
    onClose: () => void;
}

export function EditUserModal({ user, isOpen, onClose }: EditUserModalProps) {
    const { data, setData, put, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
    });
    const [sendingVerification, setSendingVerification] = useState(false);
    const [sendingReset, setSendingReset] = useState(false);

    useEffect(() => {
        if (user) {
            setData({ name: user.name, email: user.email, phone: user.telefone ?? '' });
        }
    }, [user, setData]);

    if (!user) return null;

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();

        put(route('institucional.usuarios.update', { usuario: user.id }), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const handleResendVerification = () => {
        setSendingVerification(true);
        router.post(
            route('institucional.usuarios.resend-verification', { usuario: user.id }),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setSendingVerification(false);
                },
            },
        );
    };

    const handleSendPasswordReset = () => {
        setSendingReset(true);
        router.post(
            route('institucional.usuarios.reset-password', { usuario: user.id }),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setSendingReset(false);
                },
            },
        );
    };

    return (
        <Modal
            open={isOpen}
            onOpenChange={onClose}
            title={`Editar Usuário - ${user.name}`}
            description="Atualize os dados cadastrais, reenvie a verificação de e-mail ou solicite a redefinição de senha."
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <FormField label="Nome" htmlFor="edit-user-name" error={errors.name} required>
                    <Input
                        id="edit-user-name"
                        value={data.name}
                        maxLength={255}
                        onChange={(e) => {
                            setData('name', e.target.value);
                        }}
                        required
                    />
                </FormField>

                <FormField label="E-mail" htmlFor="edit-user-email" error={errors.email} required>
                    <Input
                        id="edit-user-email"
                        type="email"
                        value={data.email}
                        maxLength={255}
                        onChange={(e) => {
                            setData('email', e.target.value);
                        }}
                        required
                    />
                </FormField>

                <FormField label="Telefone" htmlFor="edit-user-phone" error={errors.phone}>
                    <Input
                        id="edit-user-phone"
                        value={data.phone}
                        onChange={(e) => {
                            setData('phone', e.target.value);
                        }}
                    />
                </FormField>

                <div className="space-y-3 rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Verificação de e-mail</p>
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${user.email_verified_at ? 'bg-success' : 'bg-destructive'}`} />
                                <span className="text-muted-foreground text-xs">{user.email_verified_at ? 'Verificado' : 'Não verificado'}</span>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!!user.email_verified_at || sendingVerification}
                            onClick={handleResendVerification}
                        >
                            Reenviar e-mail
                        </Button>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t pt-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Senha</p>
                            <span className="text-muted-foreground text-xs">Envia um link de redefinição para o e-mail do usuário.</span>
                        </div>
                        <Button type="button" variant="outline" size="sm" disabled={sendingReset} onClick={handleSendPasswordReset}>
                            Redefinir senha
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Salvar Alterações
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
