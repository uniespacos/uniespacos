import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import HeadingSmall from '@/presentation/atoms/HeadingSmall';
import InputError from '@/presentation/atoms/InputError';
import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';
import { useForm } from '@inertiajs/react';
import { SyntheticEvent, useId, useRef, useState } from 'react';

interface DeleteItemProps {
    itemName: string;
    route: string;
    isOpen?: (open: boolean) => void;
    showHeading?: boolean;
    variant?: 'modal' | 'card';
}

export default function DeleteItem({ isOpen, route, itemName, showHeading = false, variant = 'modal' }: DeleteItemProps) {
    const formId = useId();
    const passwordInputId = `${formId}-password`;
    const [open, setOpen] = useState(variant === 'modal');
    const passwordInput = useRef<HTMLInputElement>(null);
    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const closeModal = () => {
        setOpen(false);
        isOpen?.(false);
        clearErrors();
        reset();
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            closeModal();
        } else {
            setOpen(true);
        }
    };

    const deleteItem = (e: SyntheticEvent) => {
        e.preventDefault();

        destroy(route, {
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
            },
            onError: () => {
                passwordInput.current?.focus();
            },
        });
    };

    const modalContent = (
        <ResponsiveModal
            open={open}
            onOpenChange={handleOpenChange}
            title={`Tem certeza que deseja excluir o(a) ${itemName}?`}
            description={`Uma vez que o(a) ${itemName} for excluído, todos os dados serão permanentemente removidos. Por favor, digite sua senha para confirmar que deseja excluir permanentemente o(a) ${itemName}.`}
            footer={
                <>
                    <Button type="button" variant="outline" onClick={closeModal} disabled={processing}>
                        Cancelar
                    </Button>

                    <Button variant="destructive" type="submit" form={formId} disabled={processing}>
                        {processing ? 'Excluindo...' : `Excluir ${itemName}`}
                    </Button>
                </>
            }
        >
            <form id={formId} className="space-y-4" onSubmit={deleteItem}>
                <div className="grid gap-2">
                    <Label htmlFor={passwordInputId} className="sr-only">
                        Senha
                    </Label>

                    <Input
                        id={passwordInputId}
                        type="password"
                        name="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => {
                            setData('password', e.target.value);
                        }}
                        placeholder="Digite sua senha para confirmar"
                        autoComplete="current-password"
                        autoFocus
                    />

                    <InputError message={errors.password} />
                </div>
            </form>
        </ResponsiveModal>
    );

    if (variant === 'card') {
        return (
            <div className="space-y-6">
                {showHeading && <HeadingSmall title={itemName} description={`Excluir o(a) ${itemName} e as informações permanentemente`} />}

                <div className="border-destructive-accent/30 bg-destructive-subtle space-y-4 rounded-lg border p-4">
                    <div className="text-destructive-accent relative space-y-0.5">
                        <p className="font-medium">Aviso</p>
                        <p className="text-sm">Por favor, prossiga com cautela, esta ação não pode ser desfeita.</p>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        className="border-destructive-accent/30 text-destructive-accent hover:bg-destructive-subtle"
                        onClick={() => {
                            setOpen(true);
                        }}
                    >
                        Excluir {itemName}
                    </Button>

                    {modalContent}
                </div>
            </div>
        );
    }

    return modalContent;
}
