import { translate } from '@/i18n';
import { criarTerreoInicial } from '@/lib/utils/andars/AndarHelpers';
import type { AndarFormData } from '@/types/admin-forms';
import { validarAndaresModulo } from './validarAndaresModulo';

const andarComAcesso = (nivel: number): AndarFormData => ({
    id: `andar-${String(nivel)}`,
    nome: nivel === 0 ? 'Térreo' : `${String(nivel)}º Andar`,
    nivel,
    tipo_acesso: ['comum'],
});

describe('validarAndaresModulo', () => {
    it('retorna null quando a estrutura e os tipos de acesso são válidos', () => {
        const andares = [{ ...criarTerreoInicial(), tipo_acesso: ['comum'] }, andarComAcesso(1)];

        expect(validarAndaresModulo(andares, translate)).toBeNull();
    });

    it('retorna mensagem de estrutura inválida quando falta o térreo', () => {
        const erro = validarAndaresModulo([andarComAcesso(1)], translate);

        expect(erro).toMatch(/^Estrutura inválida: /);
        expect(erro).toContain('Térreo é obrigatório');
    });

    it('retorna mensagem de tipo de acesso quando algum andar não tem acesso definido', () => {
        const andares = [
            { ...criarTerreoInicial(), tipo_acesso: ['comum'] },
            { ...andarComAcesso(1), tipo_acesso: [] },
        ];

        expect(validarAndaresModulo(andares, translate)).toBe('Todos os andares devem ter pelo menos um tipo de acesso definido.');
    });
});
