import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';

interface PrivacyLinkProps {
    newTab?: boolean;
    className?: string;
}

export function PrivacyLink({ newTab = false, className }: PrivacyLinkProps) {
    const { t } = useTranslation();
    const classes = cn('underline-offset-4 hover:underline', className);

    if (newTab) {
        return (
            <a href={route('privacidade')} target="_blank" rel="noopener noreferrer" className={classes}>
                {t('privacidade.link_rodape')}
                <span className="sr-only"> {t('privacidade.nova_aba')}</span>
            </a>
        );
    }

    return (
        <Link href={route('privacidade')} className={classes}>
            {t('privacidade.link_rodape')}
        </Link>
    );
}
