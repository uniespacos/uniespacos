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
import { cn } from '@/lib/utils';
import type { BulkAction } from '@/types/data-table';
import { CheckSquare, X } from 'lucide-react';
import { useState } from 'react';

export interface DataTableBulkActionsProps<T> {
    selectedCount: number;
    actions: BulkAction<T>[];
    selectedItems: T[];
    onClearSelection: () => void;
    className?: string;
}

export function DataTableBulkActions<T>({ selectedCount, actions, selectedItems, onClearSelection, className }: DataTableBulkActionsProps<T>) {
    const [actionToConfirm, setActionToConfirm] = useState<BulkAction<T> | null>(null);

    if (selectedCount === 0 || actions.length === 0) return null;

    const handleActionClick = (action: BulkAction<T>) => {
        if (action.requiresConfirmation) {
            setActionToConfirm(action);
        } else {
            void action.action(selectedItems);
        }
    };

    const handleConfirmAction = () => {
        if (actionToConfirm) {
            void actionToConfirm.action(selectedItems);
            setActionToConfirm(null);
        }
    };

    return (
        <>
            <div
                className={cn(
                    'border-primary/20 bg-card/95 animate-in slide-in-from-bottom fixed right-4 bottom-20 left-4 z-40 flex items-center justify-between gap-4 rounded-xl border px-4 py-2.5 shadow-2xl backdrop-blur-md duration-200 md:bottom-6 md:left-1/2 md:w-auto md:-translate-x-1/2',
                    className,
                )}
                role="region"
                aria-label="Ações em massa"
            >
                <div className="flex items-center gap-2">
                    <CheckSquare className="text-primary h-4 w-4" />
                    <span className="text-foreground text-xs font-semibold whitespace-nowrap">
                        {String(selectedCount)} {selectedCount === 1 ? 'selecionado' : 'selecionados'}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {actions.map((act) => {
                        const Icon = act.icon;
                        return (
                            <Button
                                key={act.id}
                                variant={act.variant ?? 'outline'}
                                size="sm"
                                onClick={() => {
                                    handleActionClick(act);
                                }}
                                className="h-7 gap-1.5 px-2.5 text-xs"
                            >
                                {Icon && <Icon className="h-3.5 w-3.5" />}
                                <span>{act.label}</span>
                            </Button>
                        );
                    })}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClearSelection}
                        className="text-muted-foreground hover:text-foreground h-11 w-11 md:h-7 md:w-7"
                        aria-label="Limpar seleção"
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {actionToConfirm && (
                <AlertDialog
                    open={Boolean(actionToConfirm)}
                    onOpenChange={(open) => {
                        if (!open) setActionToConfirm(null);
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{actionToConfirm.confirmationTitle ?? 'Confirmar ação em lote'}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {actionToConfirm.confirmationDescription ??
                                    `Deseja realmente executar a ação "${actionToConfirm.label}" para os ${String(selectedCount)} ${selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}?`}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleConfirmAction}
                                className={cn(
                                    actionToConfirm.variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                                )}
                            >
                                Confirmar
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </>
    );
}

export default DataTableBulkActions;
