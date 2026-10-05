import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface PaginacaoLinkProps {
    url?: string | null;
    active?: boolean;
    label: string;
    only?: string[];
    variant?: 'prev' | 'next' | 'page';
}

function isAnterior(label: string): boolean {
    return label.includes('Anterior') || label.includes('laquo');
}

function isProximo(label: string): boolean {
    return label.includes('Próximo') || label.includes('raquo');
}

export function PaginacaoLink({ url, active, label, only, variant }: PaginacaoLinkProps) {
    const { t } = useTranslation();

    const determinedVariant: 'prev' | 'next' | 'page' = variant ?? (isAnterior(label) ? 'prev' : isProximo(label) ? 'next' : 'page');

    const ariaLabel =
        determinedVariant === 'prev'
            ? t('common.pagination.previous')
            : determinedVariant === 'next'
              ? t('common.pagination.next')
              : label;

    const renderContent = () => {
        if (determinedVariant === 'prev') {
            return (
                <>
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    <span>{t('common.pagination.previous')}</span>
                </>
            );
        }

        if (determinedVariant === 'next') {
            return (
                <>
                    <span>{t('common.pagination.next')}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </>
            );
        }

        return label;
    };

    if (url) {
        return (
            <Link
                href={url}
                aria-label={ariaLabel}
                className={`focus-visible:ring-ring inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-1 focus-visible:outline-none ${
                    active ? 'bg-primary text-primary-foreground font-semibold' : 'bg-background hover:bg-accent text-foreground'
                }`}
                preserveState
                preserveScroll
                {...(only ? { only } : {})}
            >
                {renderContent()}
            </Link>
        );
    }

    return (
        <span
            className="text-muted-foreground inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm opacity-50 select-none"
            aria-disabled="true"
        >
            {renderContent()}
        </span>
    );
}
