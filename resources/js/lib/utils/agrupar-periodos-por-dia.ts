import { format } from 'date-fns';

export interface PeriodoEntrada {
    data: Date;
    horario_inicio: string;
    horario_fim: string;
}

export interface Periodo {
    inicio: string;
    fim: string;
}

export interface GrupoDiaPeriodos {
    chave: string;
    data: Date;
    periodos: Periodo[];
}

function unirContiguos(periodos: readonly Periodo[]): Periodo[] {
    const ordenados = [...periodos].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));

    return ordenados.reduce<Periodo[]>((acumulado, atual) => {
        const ultimo = acumulado.at(-1);

        if (ultimo?.fim === atual.inicio) {
            return [...acumulado.slice(0, -1), { inicio: ultimo.inicio, fim: atual.fim }];
        }

        return [...acumulado, atual];
    }, []);
}

export function agruparPeriodosPorDia(entradas: readonly PeriodoEntrada[]): GrupoDiaPeriodos[] {
    const grupos = new Map<string, { chave: string; data: Date; periodos: Periodo[] }>();

    entradas.forEach((entrada) => {
        const chave = format(entrada.data, 'yyyy-MM-dd');
        const periodo: Periodo = { inicio: entrada.horario_inicio.slice(0, 5), fim: entrada.horario_fim.slice(0, 5) };
        const grupo = grupos.get(chave);

        if (grupo) {
            grupo.periodos.push(periodo);
        } else {
            grupos.set(chave, { chave, data: entrada.data, periodos: [periodo] });
        }
    });

    return [...grupos.values()]
        .sort((a, b) => a.chave.localeCompare(b.chave))
        .map((grupo) => ({ chave: grupo.chave, data: grupo.data, periodos: unirContiguos(grupo.periodos) }));
}
