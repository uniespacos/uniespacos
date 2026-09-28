import React from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { CalendarCheck, ArrowRight, Trash2 } from 'lucide-react';
import { SlotReservaItem } from '@/types/reserva-stepper';
import { SlotCalendario } from '@/types';

export interface ReservaStickySummaryBarProps {
    slots: (SlotReservaItem | SlotCalendario)[];
    onConfirm: () => void;
    onClear: () => void;
    disabled?: boolean;
    isEditMode?: boolean;
    className?: string;
}

export const ReservaStickySummaryBar: React.FC<ReservaStickySummaryBarProps> = ({
    slots,
    onConfirm,
    onClear,
    disabled = false,
    isEditMode = false,
    className,
}) => {
    const { t } = useTranslation();
    if (slots.length === 0) return null;

    const slotCount = slots.length;
    const slotLabel = slotCount === 1 ? t('reservas.stepper.slot_selected') : t('reservas.stepper.slots_selected', { count: String(slotCount) });

    return (
        <aside
            aria-label={t('reservas.stepper.selected_slots')}
            className={`bg-card/95 border-border animate-in fade-in slide-in-from-bottom-2 fixed right-4 bottom-20 left-4 z-30 flex flex-col items-stretch justify-between gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md transition-all duration-200 sm:flex-row sm:items-center md:right-8 md:bottom-4 md:left-auto ${className ?? ''}`}
        >
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary shrink-0 rounded-lg p-2">
                    <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex min-w-0 flex-col">
                    <span className="text-foreground truncate text-xs font-semibold">{slotLabel}</span>
                    <span className="text-muted-foreground truncate text-[11px]">
                        {isEditMode ? t('reservas.stepper.ready_edit') : t('reservas.stepper.ready_create')}
                    </span>
                </div>
            </div>

            <div className="border-border/50 flex items-center justify-end gap-2 border-t pt-2 sm:border-t-0 sm:pt-0">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="text-muted-foreground hover:text-destructive-accent hover:bg-destructive/10 h-8 px-2.5 text-xs"
                >
                    <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {t('common.actions.clear')}
                </Button>
                <Button type="button" size="sm" onClick={onConfirm} disabled={disabled} className="h-8 gap-1.5 px-3.5 text-xs font-medium shadow-sm">
                    <span>{isEditMode ? t('reservas.stepper.review_edit') : t('reservas.stepper.continue')}</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
            </div>
        </aside>
    );
};
