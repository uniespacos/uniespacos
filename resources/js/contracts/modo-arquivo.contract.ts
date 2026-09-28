export const ModoArquivo = {
    ATIVAS: 'ativas',
    ARQUIVADAS: 'arquivadas',
    TODAS: 'todas',
} as const;

export type ModoArquivoType = (typeof ModoArquivo)[keyof typeof ModoArquivo];

export const MODO_ARQUIVO_DEFAULT: ModoArquivoType = ModoArquivo.ATIVAS;
