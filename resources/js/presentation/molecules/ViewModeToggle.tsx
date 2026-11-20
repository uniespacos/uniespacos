import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { LayoutGrid, List } from 'lucide-react';

export type ViewMode = 'table' | 'grid';

interface ViewModeToggleProps {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    className?: string;
}

export function ViewModeToggle({ viewMode, onViewModeChange, className }: ViewModeToggleProps) {
    const { t } = useTranslation();

    return (
        <div className={cn('bg-muted inline-flex items-center rounded-lg p-1', className)} role="group" aria-label={t('common.viewMode.groupAria')}>
            <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-8 px-2.5 text-xs', viewMode === 'table' && 'shadow-sm')}
                onClick={() => {
                    onViewModeChange('table');
                }}
                aria-pressed={viewMode === 'table'}
                aria-label={t('common.viewMode.listAria')}
            >
                <List className="mr-1.5 h-4 w-4" />
                {t('common.viewMode.list')}
            </Button>
            <Button
                type="button"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-8 px-2.5 text-xs', viewMode === 'grid' && 'shadow-sm')}
                onClick={() => {
                    onViewModeChange('grid');
                }}
                aria-pressed={viewMode === 'grid'}
                aria-label={t('common.viewMode.cardsAria')}
            >
                <LayoutGrid className="mr-1.5 h-4 w-4" />
                {t('common.viewMode.cards')}
            </Button>
        </div>
    );
}
