import { getCookie, getStatusReservaColor, getStatusReservaText } from './utils';

/**
 * As duas funções passaram a delegar para ESTILO_SITUACAO (constants/situacao-reserva)
 * em vez de repetir o próprio switch — eram a terceira e quarta definição
 * divergente do estilo de cada situação. `getStatusReservaText` também não
 * tratava 'inativa' antes, caindo em "Desconhecido".
 */
describe('getStatusReservaColor', () => {
    it.each([
        ['em_analise', 'bg-warning'],
        ['deferida', 'bg-success'],
        ['indeferida', 'bg-destructive'],
        ['parcialmente_deferida', 'bg-info'],
        ['inativa', 'bg-neutral-accent'],
    ] as const)('retorna o tom sólido de %s', (situacao, classe) => {
        expect(getStatusReservaColor(situacao)).toBe(classe);
    });
});

describe('getStatusReservaText', () => {
    it.each([
        ['em_analise', 'Em Análise'],
        ['deferida', 'Deferida'],
        ['indeferida', 'Indeferida'],
        ['parcialmente_deferida', 'Parcialmente Deferida'],
        ['inativa', 'Inativa / Cancelada'],
    ] as const)('retorna o rótulo acentuado de %s', (situacao, rotulo) => {
        expect(getStatusReservaText(situacao)).toBe(rotulo);
    });
});

describe('getCookie', () => {
    const COOKIE_NAME = 'test_cookie';

    afterEach(() => {
        // Clean up cookies after each test
        document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });

    it('should return the value of a single cookie', () => {
        document.cookie = `${COOKIE_NAME}=test_value; path=/`;
        expect(getCookie(COOKIE_NAME)).toBe('test_value');
    });

    it('should return the value of a cookie among multiple cookies', () => {
        document.cookie = `other_cookie=other_value; path=/`;
        document.cookie = `${COOKIE_NAME}=test_value; path=/`;
        expect(getCookie(COOKIE_NAME)).toBe('test_value');
    });

    it('should return undefined if the cookie does not exist', () => {
        expect(getCookie('non_existent_cookie')).toBeUndefined();
    });

    it('should handle cookies with empty values', () => {
        document.cookie = `${COOKIE_NAME}=; path=/`;
        expect(getCookie(COOKIE_NAME)).toBe('');
    });

    it('should return undefined for a partially matched cookie name', () => {
        document.cookie = `partial_test_cookie=value; path=/`;
        expect(getCookie(COOKIE_NAME)).toBeUndefined();
    });
});
