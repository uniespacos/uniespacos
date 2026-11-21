import { usePage } from '@inertiajs/react';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { possuiErroDeParametroUrl, useErrosParametrosUrl } from './use-erros-parametros-url';

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(),
}));

jest.mock('sonner', () => ({
    toast: { error: jest.fn() },
}));

const mockedUsePage = usePage as unknown as jest.Mock;
const mensagemPadrao = 'Um dos parâmetros da página é inválido. Verifique o filtro ou a semana selecionada.';

function prepararPagina(errors: Record<string, string | string[]> | undefined) {
    mockedUsePage.mockReturnValue({ props: { errors } });
}

describe('possuiErroDeParametroUrl', () => {
    it('retorna false sem erros ou com erros de outros campos', () => {
        expect(possuiErroDeParametroUrl(undefined)).toBe(false);
        expect(possuiErroDeParametroUrl({})).toBe(false);
        expect(possuiErroDeParametroUrl({ email: 'E-mail inválido.' })).toBe(false);
    });

    it('retorna true para erro de semana ou de filtro de texto', () => {
        expect(possuiErroDeParametroUrl({ semana: 'Formato inválido.' })).toBe(true);
        expect(possuiErroDeParametroUrl({ search: 'Campo inválido.' })).toBe(true);
    });

    it('ignora erros que chegam como array', () => {
        expect(possuiErroDeParametroUrl({ search: ['Campo inválido.'] })).toBe(false);
    });
});

describe('useErrosParametrosUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('exibe toast de erro quando há erro de semana', () => {
        prepararPagina({ semana: 'O campo semana não corresponde ao formato Y-m-d.' });

        renderHook(() => {
            useErrosParametrosUrl();
        });

        expect(toast.error).toHaveBeenCalledTimes(1);
        expect(toast.error).toHaveBeenCalledWith(mensagemPadrao);
    });

    it('não exibe toast quando não há erros', () => {
        prepararPagina({});

        renderHook(() => {
            useErrosParametrosUrl();
        });

        expect(toast.error).not.toHaveBeenCalled();
    });

    it('não exibe toast para erros que não são de parâmetro de URL', () => {
        prepararPagina({ titulo: 'O título é obrigatório.' });

        renderHook(() => {
            useErrosParametrosUrl();
        });

        expect(toast.error).not.toHaveBeenCalled();
    });

    it('exibe novamente quando chega um novo conjunto de erros', () => {
        prepararPagina({ semana: 'Formato inválido.' });
        const { rerender } = renderHook(() => {
            useErrosParametrosUrl();
        });

        prepararPagina({ semana: 'Formato inválido.' });
        rerender();

        expect(toast.error).toHaveBeenCalledTimes(2);
    });
});
