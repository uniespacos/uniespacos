import { Appearance, useAppearance } from '@/hooks/use-appearance';
import { useTranslation, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { LucideIcon, Monitor, Moon, Sun } from 'lucide-react';
import { HTMLAttributes } from 'react';

export default function AppearanceToggleTab({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();
    const { t } = useTranslation();

    const tabs: { value: Appearance; icon: LucideIcon; labelKey: TranslationKey }[] = [
        { value: 'light', icon: Sun, labelKey: 'settings.appearance.light' },
        { value: 'dark', icon: Moon, labelKey: 'settings.appearance.dark' },
        { value: 'system', icon: Monitor, labelKey: 'settings.appearance.system' },
    ];

    return (
        <div className={cn('bg-muted inline-flex gap-1 rounded-lg p-1', className)} {...props}>
            {tabs.map(({ value, icon: Icon, labelKey }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => {
                        updateAppearance(value);
                    }}
                    className={cn(
                        'flex cursor-pointer items-center rounded-md px-3.5 py-1.5 transition-colors',
                        appearance === value
                            ? 'bg-background text-foreground font-medium shadow-xs'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                >
                    <Icon className="mr-1.5 h-4 w-4" />
                    <span className="text-sm">{t(labelKey)}</span>
                </button>
            ))}
        </div>
    );
}
