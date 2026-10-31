import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    size?: 'default' | 'compact';
}

const SIZE_CLASSES = {
    default: {
        root: 'gap-3 px-6 py-14',
        iconWrap: 'p-3.5',
        icon: 'h-6 w-6',
        title: 'text-base',
        description: 'text-sm',
    },
    compact: {
        root: 'gap-2.5 px-4 py-8',
        iconWrap: 'p-2.5',
        icon: 'h-5 w-5',
        title: 'text-sm',
        description: 'text-xs',
    },
} as const;

export function EmptyState({ icon: Icon, title, description, action, size = 'default' }: EmptyStateProps) {
    const classes = SIZE_CLASSES[size];

    return (
        <div
            data-size={size}
            className={cn(
                'border-border text-muted-foreground flex flex-col items-center justify-center rounded-xl border border-dashed text-center',
                classes.root,
            )}
        >
            {Icon && (
                <div className={cn('bg-muted text-muted-foreground rounded-full', classes.iconWrap)}>
                    <Icon className={classes.icon} aria-hidden="true" />
                </div>
            )}
            <div className="max-w-md space-y-1">
                <h3 className={cn('text-foreground leading-snug font-semibold', classes.title)}>{title}</h3>
                {description && <p className={cn('text-muted-foreground', classes.description)}>{description}</p>}
            </div>
            {action && <div className="pt-1">{action}</div>}
        </div>
    );
}
