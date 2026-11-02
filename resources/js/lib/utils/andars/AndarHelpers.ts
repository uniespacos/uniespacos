import { type AndarFormData } from '@/types/admin-forms';

// Função para gerar ID único
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Converte nível numérico para nome do andar
 */
export function nivelParaNome(nivel: number): string {
    if (nivel < 0) {
        const numeroSubsolo = Math.abs(nivel);
        return numeroSubsolo === 1 ? 'subsolo-1' : `subsolo-${numeroSubsolo}`;
    }
    if (nivel === 0) return 'terreo';
    return `andar-${nivel}`;
}

/**
 * Converte nível numérico para label amigável
 */
export function nivelParaLabel(nivel: number): string {
    if (nivel < 0) {
        const numeroSubsolo = Math.abs(nivel);
        return numeroSubsolo === 1 ? 'Subsolo' : `${numeroSubsolo}º Subsolo`;
    }
    if (nivel === 0) return 'Térreo';
    return `${nivel}º Andar`;
}

/**
 * Converte nome do andar para nível numérico
 */
export function nomeParaNivel(nome: string): number {
    if (nome.startsWith('subsolo-')) {
        return -Number.parseInt(nome.split('-')[1]);
    }
    if (nome === 'terreo') return 0;
    if (nome.startsWith('andar-')) {
        return Number.parseInt(nome.split('-')[1]);
    }
    return 0;
}

/**
 * Cria o andar térreo inicial
 */
export function criarTerreoInicial(): AndarFormData {
    return {
        id: generateId(),
        nome: nivelParaNome(0),
        nivel: 0,
        tipo_acesso: [],
    };
}

/**
 * Cria um novo andar
 */
export function criarNovoAndar(nivel: number): AndarFormData {
    return {
        id: generateId(),
        nome: nivelParaNome(nivel),
        nivel,
        tipo_acesso: [],
    };
}

/**
 * Ordena andares por nível (subsolo -> térreo -> andares superiores)
 */
export function ordenarAndares(andares: AndarFormData[]): AndarFormData[] {
    return [...andares].sort((a, b) => a.nivel - b.nivel);
}

/**
 * Verifica se pode adicionar andar superior
 */
export function podeAdicionarSuperior(andares: AndarFormData[]): boolean {
    const niveis = andares.map((a) => a.nivel);
    const maiorNivel = Math.max(...niveis);
    return maiorNivel < 10; // Máximo 10 andares
}

/**
 * Verifica se pode adicionar subsolo
 */
export function podeAdicionarSubsolo(andares: AndarFormData[]): boolean {
    const niveis = andares.map((a) => a.nivel);
    const menorNivel = Math.min(...niveis);
    return menorNivel > -2; // Máximo 2 subsolos
}

/**
 * Calcula próximo nível superior
 */
export function proximoNivelSuperior(andares: AndarFormData[]): number {
    const niveis = andares.map((a) => a.nivel);
    const maiorNivel = Math.max(...niveis);
    return maiorNivel + 1;
}

/**
 * Calcula próximo nível de subsolo
 */
export function proximoNivelSubsolo(andares: AndarFormData[]): number {
    const niveis = andares.map((a) => a.nivel);
    const menorNivel = Math.min(...niveis);
    return menorNivel - 1;
}

/**
 * Encontra andares que dependem de um andar específico
 */
export function encontrarAndaresDependentes(andarNivel: number, todosAndares: AndarFormData[]): AndarFormData[] {
    return todosAndares.filter((andar) => {
        // Para andares superiores (1, 2, 3...), dependem do andar imediatamente inferior
        if (andar.nivel > 0 && andar.nivel === andarNivel + 1) {
            return true;
        }

        // Para térreo, depende do subsolo -1 (se existir)
        if (andar.nivel === 0 && andarNivel === -1) {
            return true;
        }

        // Para subsolos, o subsolo superior depende do inferior
        if (andar.nivel < 0 && andar.nivel === andarNivel + 1) {
            return true;
        }

        return false;
    });
}

/**
 * Verifica se pode remover andar
 * REGRAS:
 * 1. Térreo NUNCA pode ser removido
 * 2. Não pode remover se há andares superiores dependentes
 * 3. Só pode remover "do topo para baixo" (andares superiores)
 * 4. Só pode remover "de baixo para cima" (subsolos)
 */
export function podeRemoverAndar(andar: AndarFormData, todosAndares: AndarFormData[]): boolean {
    // REGRA 1: Térreo NUNCA pode ser removido
    if (andar.nivel === 0) {
        return false;
    }

    // REGRA 2: Verificar se há andares superiores que dependem deste
    const niveis = todosAndares.map((a) => a.nivel);

    if (andar.nivel > 0) {
        // Para andares superiores: não pode remover se há andares com nível maior
        const temAndaresSuperior = niveis.some((nivel) => nivel > andar.nivel);
        if (temAndaresSuperior) {
            return false;
        }
    }

    if (andar.nivel < 0) {
        // Para subsolos: não pode remover se há subsolos mais profundos
        const temSubsoloMaisProfundo = niveis.some((nivel) => nivel < andar.nivel);
        if (temSubsoloMaisProfundo) {
            return false;
        }
    }

    return true;
}

/**
 * Obtém mensagem explicativa de por que não pode remover
 */
export function getMensagemBloqueioRemocao(andar: AndarFormData, todosAndares: AndarFormData[]): string {
    if (andar.nivel === 0) {
        return 'Térreo é obrigatório e não pode ser removido';
    }

    const niveis = todosAndares.map((a) => a.nivel);

    if (andar.nivel > 0) {
        const andaresSuperior = niveis.filter((nivel) => nivel > andar.nivel).sort((a, b) => a - b);
        if (andaresSuperior.length > 0) {
            const proximoAndar = andaresSuperior[0];
            return `Não é possível remover: existe o ${nivelParaLabel(proximoAndar)} que depende deste andar`;
        }
    }

    if (andar.nivel < 0) {
        const subsolosMaisProfundos = niveis.filter((nivel) => nivel < andar.nivel).sort((a, b) => b - a);
        if (subsolosMaisProfundos.length > 0) {
            const proximoSubsolo = subsolosMaisProfundos[0];
            return `Não é possível remover: existe o ${nivelParaLabel(proximoSubsolo)} que depende deste subsolo`;
        }
    }

    return 'Remover este andar';
}

/**
 * Verifica se o módulo tem térreo (validação de integridade)
 */
export function temTerreo(andares: AndarFormData[]): boolean {
    return andares.some((andar) => andar.nivel === 0);
}

/**
 * Garante que o térreo existe, criando se necessário
 */
export function garantirTerreo(andares: AndarFormData[]): AndarFormData[] {
    if (temTerreo(andares)) {
        return andares;
    }

    // Se não tem térreo, adicionar
    return [...andares, criarTerreoInicial()];
}

/**
 * Valida se a estrutura de andares está íntegra
 */
export function validarEstrutura(andares: AndarFormData[]): {
    valido: boolean;
    erros: string[];
} {
    const erros: string[] = [];

    // Verificar se tem térreo
    if (!temTerreo(andares)) {
        erros.push('Térreo é obrigatório e não pode ser removido');
    }

    // Verificar se não há andares duplicados
    const niveis = andares.map((a) => a.nivel);
    const niveisUnicos = [...new Set(niveis)];
    if (niveis.length !== niveisUnicos.length) {
        erros.push('Há andares duplicados');
    }

    // Verificar se há gaps na sequência
    const niveisOrdenados = niveis.sort((a, b) => a - b);
    for (let i = 1; i < niveisOrdenados.length; i++) {
        const atual = niveisOrdenados[i];
        const anterior = niveisOrdenados[i - 1];

        // Verificar gap entre andares consecutivos
        if (atual - anterior > 1) {
            erros.push(`Há um gap entre ${nivelParaLabel(anterior)} e ${nivelParaLabel(atual)}`);
        }
    }

    return {
        valido: erros.length === 0,
        erros,
    };
}

/**
 * Obtém lista de andares que podem ser removidos
 */
export function getAndaresRemovíveis(andares: AndarFormData[]): AndarFormData[] {
    return andares.filter((andar) => podeRemoverAndar(andar, andares));
}

/**
 * Obtém o próximo andar que deve ser removido (seguindo a sequência)
 */
export function getProximoAndarParaRemover(andares: AndarFormData[]): AndarFormData | null {
    const removiveis = getAndaresRemovíveis(andares);

    if (removiveis.length === 0) {
        return null;
    }

    // Para andares superiores, remover o maior primeiro
    const andaresSuperior = removiveis.filter((a) => a.nivel > 0);
    if (andaresSuperior.length > 0) {
        return andaresSuperior.reduce((maior, atual) => (atual.nivel > maior.nivel ? atual : maior));
    }

    // Para subsolos, remover o mais profundo primeiro
    const subsolos = removiveis.filter((a) => a.nivel < 0);
    if (subsolos.length > 0) {
        return subsolos.reduce((menor, atual) => (atual.nivel < menor.nivel ? atual : menor));
    }

    return null;
}
