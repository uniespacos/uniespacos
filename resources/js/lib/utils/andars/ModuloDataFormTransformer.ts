import { AndarFormData } from '@/presentation/organisms/AndarFormCard';
import { CadastrarModuloForm } from '@/presentation/pages/Administrativo/Modulos/CadastrarModulo';
import { Modulo } from '@/types';
import { criarTerreoInicial, nivelParaNome, nomeParaNivel } from './AndarHelpers';

/**
 * Transforma os dados do backend (Modulo) para o formato do formulário
 */
export function transformModuloToFormData(modulo: Modulo): CadastrarModuloForm {
    let andares: AndarFormData[] = [];

    if (modulo.andars && modulo.andars.length > 0) {
        andares = modulo.andars.map((andar) => ({
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            nome: andar.nome,
            nivel: nomeParaNivel(andar.nome),
            tipo_acesso: Array.isArray(andar.tipo_acesso) ? andar.tipo_acesso : [],
        }));
    } else {
        // Se não tem andares, criar térreo inicial
        andares = [criarTerreoInicial()];
    }

    return {
        nome: modulo.nome || '',
        unidade_id: modulo.unidade?.id.toString() || '',
        andares,
    };
}

/**
 * Transforma os dados do formulário para o formato do backend
 */
export function transformFormDataToModulo(formData: CadastrarModuloForm): {
    nome: string;
    unidade_id: number;
    andares: {
        nome: string;
        tipo_acesso: string[];
    }[];
} {
    return {
        nome: formData.nome,
        unidade_id: Number.parseInt(formData.unidade_id),
        andares: formData.andares.map((andar) => ({
            nome: nivelParaNome(andar.nivel),
            tipo_acesso: andar.tipo_acesso,
        })),
    };
}

/**
 * Verifica se é modo de edição baseado na presença de um módulo
 */
export function isEditMode(modulo?: Modulo): boolean {
    return modulo?.id !== undefined;
}
