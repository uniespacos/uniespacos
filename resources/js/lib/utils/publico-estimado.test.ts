import { publicoEstimadoAcimaDaCapacidade, publicoEstimadoValido } from './publico-estimado';

describe('publicoEstimadoValido', () => {
    it('aceita vazio, pois o campo é opcional', () => {
        expect(publicoEstimadoValido('')).toBe(true);
        expect(publicoEstimadoValido(null)).toBe(true);
        expect(publicoEstimadoValido(undefined)).toBe(true);
    });

    it('aceita inteiros entre 1 e 5000 nos limites', () => {
        expect(publicoEstimadoValido(1)).toBe(true);
        expect(publicoEstimadoValido('40')).toBe(true);
        expect(publicoEstimadoValido(5000)).toBe(true);
    });

    it('rejeita zero, acima de 5000, decimais e texto', () => {
        expect(publicoEstimadoValido(0)).toBe(false);
        expect(publicoEstimadoValido(5001)).toBe(false);
        expect(publicoEstimadoValido('3.5')).toBe(false);
        expect(publicoEstimadoValido('abc')).toBe(false);
    });
});

describe('publicoEstimadoAcimaDaCapacidade', () => {
    it('sinaliza quando o público passa da capacidade do espaço', () => {
        expect(publicoEstimadoAcimaDaCapacidade(31, 30)).toBe(true);
    });

    it('não sinaliza quando igual ou abaixo da capacidade', () => {
        expect(publicoEstimadoAcimaDaCapacidade(30, 30)).toBe(false);
        expect(publicoEstimadoAcimaDaCapacidade(10, 30)).toBe(false);
    });

    it('não sinaliza sem público informado ou sem capacidade conhecida', () => {
        expect(publicoEstimadoAcimaDaCapacidade('', 30)).toBe(false);
        expect(publicoEstimadoAcimaDaCapacidade(50, undefined)).toBe(false);
        expect(publicoEstimadoAcimaDaCapacidade(50, 0)).toBe(false);
    });
});
