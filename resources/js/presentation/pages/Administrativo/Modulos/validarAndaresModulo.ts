import type { TranslationKey, TranslationParams } from '@/i18n';
import { validarEstrutura } from '@/lib/utils/andars/AndarHelpers';
import type { AndarFormData } from '@/types/admin-forms';

type Translate = (key: TranslationKey, params?: TranslationParams) => string;

export function validarAndaresModulo(andares: AndarFormData[], t: Translate): string | null {
    const validacaoEstrutura = validarEstrutura(andares);
    if (!validacaoEstrutura.valido) {
        return t('admin.modulos.erros.estruturaInvalida', { detalhes: validacaoEstrutura.erros.join(', ') });
    }

    if (andares.some((andar) => andar.tipo_acesso.length === 0)) {
        return t('admin.modulos.erros.tipoAcessoObrigatorio');
    }

    return null;
}
