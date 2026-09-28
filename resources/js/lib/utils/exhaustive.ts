/**
 * Garante em tempo de compilação que todos os casos de um tipo union foram tratados.
 */
export function assertNever(value: never, customMessage?: string): never {
    throw new Error(customMessage ?? `Valor de enum/union não tratado: ${JSON.stringify(value)}`);
}

/**
 * Valida se um valor de runtime pertence aos valores de um objeto 'as const'.
 */
export function isEnumValue<T extends Record<string, string>>(enumObj: T, value: unknown): value is T[keyof T] {
    return typeof value === 'string' && Object.values(enumObj).includes(value);
}
