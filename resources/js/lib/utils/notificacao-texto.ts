import type { TranslationKey, TranslationParams } from '@/i18n';
import type { ChaveNotificacao, NotificationPayloadData } from '@/types/notification';

interface TextoDeNotificacao {
    titulo: TranslationKey;
    descricao: TranslationKey;
}

const TEXTOS_POR_CHAVE: Record<ChaveNotificacao, TextoDeNotificacao> = {
    'reservas.nova_solicitacao': {
        titulo: 'reservas.notificacoes.nova_solicitacao.titulo',
        descricao: 'reservas.notificacoes.nova_solicitacao.descricao',
    },
    'reservas.cancelada': {
        titulo: 'reservas.notificacoes.cancelada.titulo',
        descricao: 'reservas.notificacoes.cancelada.descricao',
    },
};

export function isChaveNotificacao(chave: unknown): chave is ChaveNotificacao {
    return typeof chave === 'string' && Object.hasOwn(TEXTOS_POR_CHAVE, chave);
}

export function resolverTextoNotificacao(
    data: NotificationPayloadData,
    t: (key: TranslationKey, params?: TranslationParams) => string,
): { titulo: string; mensagem: string } {
    if (isChaveNotificacao(data.chave)) {
        const textos = TEXTOS_POR_CHAVE[data.chave];

        return { titulo: t(textos.titulo), mensagem: t(textos.descricao, data.parametros) };
    }

    return { titulo: data.titulo, mensagem: data.mensagem ?? data.descricao ?? '' };
}
