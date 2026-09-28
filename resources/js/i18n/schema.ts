import type { ptBR } from './locales/pt-BR';

/** Transforma recursivamente os valores literais do dicionário base em string, mantendo a estrutura exata de chaves */
export type DeepStringSchema<T> = {
    readonly [K in keyof T]: T[K] extends object ? DeepStringSchema<T[K]> : string;
};

/** Dicionário base definindo a estrutura obrigatória para todos os idiomas */
export type TranslationSchema = DeepStringSchema<typeof ptBR>;

/** Gera recursivamente todas as chaves em notação de ponto (ex: 'reservas.situacao.deferida') */
export type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<TranslationSchema>;
