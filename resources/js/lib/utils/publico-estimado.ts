export const PUBLICO_ESTIMADO_MIN = 1;
export const PUBLICO_ESTIMADO_MAX = 5000;

export function publicoEstimadoVazio(valor: number | string | null | undefined): boolean {
    if (valor === null || valor === undefined) {
        return true;
    }

    return typeof valor === 'string' && valor.trim() === '';
}

export function publicoEstimadoValido(valor: number | string | null | undefined): boolean {
    if (valor === null || valor === undefined) {
        return true;
    }

    if (typeof valor === 'string') {
        const limpo = valor.trim();
        if (limpo === '') {
            return true;
        }
        if (!/^-?\d+$/.test(limpo)) {
            return false;
        }
        const numero = Number(limpo);
        return Number.isInteger(numero) && numero >= PUBLICO_ESTIMADO_MIN && numero <= PUBLICO_ESTIMADO_MAX;
    }

    return Number.isInteger(valor) && valor >= PUBLICO_ESTIMADO_MIN && valor <= PUBLICO_ESTIMADO_MAX;
}

export function publicoEstimadoAcimaDaCapacidade(valor: number | string | null | undefined, capacidade: number | null | undefined): boolean {
    if (publicoEstimadoVazio(valor) || !capacidade) {
        return false;
    }

    return Number(valor) > capacidade;
}
