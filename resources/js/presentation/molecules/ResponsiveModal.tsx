import * as React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';

export interface ResponsiveModalProps {
    open?: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose?: () => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    footer?: React.ReactNode;
    children?: React.ReactNode;
    trigger?: React.ReactNode;
    className?: string;
    size?: ModalSize;
    maxWidth?: ModalSize;
    showCloseButton?: boolean;
}

export function ResponsiveModal({
    open,
    isOpen,
    onOpenChange,
    onClose,
    title,
    description,
    footer,
    children,
    trigger,
    className,
    size,
    maxWidth,
    showCloseButton = true,
}: ResponsiveModalProps) {
    const isMobile = useIsMobile();
    const effectiveOpen = open ?? isOpen ?? false;

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange?.(nextOpen);
        if (!nextOpen) {
            onClose?.();
        }
    };

    const effectiveSize = size ?? maxWidth ?? 'md';

    const maxWidthClasses: Record<ModalSize, string> = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
        '3xl': 'sm:max-w-3xl',
        '4xl': 'sm:max-w-4xl',
        '5xl': 'sm:max-w-5xl',
    };

    const hasHeader = Boolean(title ?? description);

    if (isMobile) {
        return (
            <Drawer open={effectiveOpen} onOpenChange={handleOpenChange}>
                {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
                <DrawerContent className={cn('flex min-h-0 flex-col px-4 pb-6', className)}>
                    {hasHeader && (
                        <DrawerHeader className="px-0 pt-2 pb-3 text-left">
                            {title && <DrawerTitle>{title}</DrawerTitle>}
                            {description && <DrawerDescription>{description}</DrawerDescription>}
                        </DrawerHeader>
                    )}
                    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto pt-1 pb-[env(safe-area-inset-bottom)]">{children}</div>
                    {footer && <DrawerFooter className="px-0 pt-3">{footer}</DrawerFooter>}
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={effectiveOpen} onOpenChange={handleOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent
                className={cn(maxWidthClasses[effectiveSize], 'flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0', className)}
                showCloseButton={showCloseButton}
            >
                {hasHeader && (
                    <DialogHeader className="shrink-0 border-b px-6 pt-6 pb-4">
                        {title && <DialogTitle>{title}</DialogTitle>}
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">{children}</div>
                {footer && <DialogFooter className="shrink-0 border-t px-6 py-4">{footer}</DialogFooter>}
            </DialogContent>
        </Dialog>
    );
}
