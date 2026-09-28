import type React from 'react';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';

interface ConfirmDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description: React.ReactNode;
    onConfirm: () => void;
    isDeleting?: boolean;
    confirmText?: string;
    cancelText?: string;
    disabled?: boolean;
    showCancel?: boolean;
    closeText?: string;
}

export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    description,
    onConfirm,
    isDeleting = false,
    confirmText,
    cancelText,
    disabled = false,
    showCancel = true,
    closeText,
}: ConfirmDeleteDialogProps) {
    const { t } = useTranslation();

    const dialogTitle = title ?? t('common.dialogs.deleteTitle');
    const dialogConfirmText = confirmText ?? t('common.actions.delete');
    const dialogCancelText = cancelText ?? t('common.actions.cancel');
    const dialogCloseText = closeText ?? t('common.actions.close');

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                    {disabled && closeText ? (
                        <Button
                            variant="outline"
                            onClick={() => {
                                onOpenChange(false);
                            }}
                            type="button"
                        >
                            {dialogCloseText}
                        </Button>
                    ) : (
                        <>
                            {showCancel && <AlertDialogCancel disabled={isDeleting}>{dialogCancelText}</AlertDialogCancel>}
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    onConfirm();
                                }}
                                disabled={disabled || isDeleting}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? t('common.actions.deleting') : dialogConfirmText}
                            </AlertDialogAction>
                        </>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
