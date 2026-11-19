export const PUBLICO_ESTIMADO_MIN = 1;
export const PUBLICO_ESTIMADO_MAX = 5000;

export function publicoEstimadoVazio(valor: number | string | null | undefined): boolean {
    return valor === null || valor === undefined || valor === '';
}

export function publicoEstimadoValido(valor: number | string | null | undefined): boolean {
    if (publicoEstimadoVazio(valor)) {
        return true;
    }

    const numero = Number(valor);

    return Number.isInteger(numero) && numero >= PUBLICO_ESTIMADO_MIN && numero <= PUBLICO_ESTIMADO_MAX;
}

export function publicoEstimadoAcimaDaCapacidade(valor: number | string | null | undefined, capacidade: number | null | undefined): boolean {
    if (publicoEstimadoVazio(valor) || !capacidade) {
        return false;
    }

    return Number(valor) > capacidade;
}
