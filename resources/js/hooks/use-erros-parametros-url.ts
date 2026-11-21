import { useTranslation } from '@/i18n';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

// Só campos que nenhum formulário usa: `situacao`, por exemplo, também é campo da avaliação de reserva.
const PARAMETROS_URL_VALIDADOS = ['semana', 'search'] as const;

export type ErrorBagInertia = Record<string, string | string[] | undefined>;

export function possuiErroDeParametroUrl(errors: ErrorBagInertia | undefined): boolean {
    if (!errors) {
        return false;
    }

    return PARAMETROS_URL_VALIDADOS.some((campo) => typeof errors[campo] === 'string');
}

export function useErrosParametrosUrl(): void {
    const { t } = useTranslation();
    const { errors } = usePage<{ errors?: ErrorBagInertia }>().props;

    useEffect(() => {
        if (possuiErroDeParametroUrl(errors)) {
            toast.error(t('errors.url_param_invalid'));
        }
    }, [errors, t]);
}
