import { ESTILO_SITUACAO } from '@/constants/situacao-reserva';
import { Turno, TurnoType } from '@/contracts/turnos.contract';
import { assertNever } from '@/lib/utils/exhaustive';
import { Horario, SituacaoReserva } from '@/types';
import { type ClassValue, clsx } from 'clsx';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

export function getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return undefined;
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
export const identificarTurno = (hora: number): 'manha' | 'tarde' | 'noite' => {
    if (hora >= 7 && hora <= 12) return 'manha';
    if (hora >= 13 && hora <= 18) return 'tarde';
    return 'noite';
};
export function pegarPrimeiroHorario(horarios: Horario[]) {
    if (horarios.length == 1) return horarios[0];
    let horario_tmp = horarios[0];
    horarios.forEach((horario) => {
        if (horario.data < horario_tmp.data) {
            horario_tmp = horario;
        } else if (horario.data == horario_tmp.data && horario.horario_inicio < horario_tmp.horario_inicio) {
            horario_tmp = horario;
        }
    });

    return horario_tmp;
}
export function pegarUltimoHorario(horarios: Horario[]) {
    if (horarios.length == 1) return horarios[0];
    let horario_tmp = horarios[0];
    horarios.forEach((horario) => {
        if (horario.data > horario_tmp.data) {
            horario_tmp = horario;
        } else if (horario.data == horario_tmp.data && horario.horario_inicio > horario_tmp.horario_inicio) {
            horario_tmp = horario;
        }
    });

    return horario_tmp;
}

export const diasSemanaParser = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

/** Tom sólido da situação. A definição vive em ESTILO_SITUACAO. */
export const getStatusReservaColor = (situacao: SituacaoReserva) => ESTILO_SITUACAO[situacao].solido ?? 'bg-muted-foreground';

/** Rótulo da situação. Idem — inclusive os acentos, que aqui faltavam. */
export const getStatusReservaText = (situacao: SituacaoReserva) => ESTILO_SITUACAO[situacao].label ?? 'Desconhecido';

export const getTurnoText = (turno: TurnoType | undefined) => {
    switch (turno) {
        case Turno.MANHA:
            return 'Manhã';
        case Turno.TARDE:
            return 'Tarde';
        case Turno.NOITE:
            return 'Noite';
        case undefined:
            return 'Desconhecido';
        default:
            return assertNever(turno);
    }
};
export function useDebounce(value: string, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

export function getPrimeirosDoisNomes(nomeCompleto: string | undefined): string {
    // 1. Verifica se o nome não é nulo ou vazio
    if (!nomeCompleto) {
        return 'N/A';
    }

    // 2. Divide o nome em palavras, pega as duas primeiras e junta de volta
    const palavras = nomeCompleto.trim().split(' ');
    return palavras.slice(0, 2).join(' ');
}

export function diasDaSemana(dataReferencia: Date, hoje: Date) {
    const inicioDaSemana = startOfWeek(dataReferencia, { weekStartsOn: 1 }); // 1 = Segunda-feira

    return Array.from({ length: 7 }).map((_, i) => {
        const dia = addDays(inicioDaSemana, i);
        return {
            data: dia,
            nome: format(dia, 'EEEE', { locale: ptBR }),
            // 'EEE' no locale pt-BR devolve o nome por extenso ("segunda"), não
            // a forma curta — os três consumidores faziam `.replace('.', '')`
            // esperando "seg.", o que nunca casava. 'EEEEEE' é a forma curta de
            // verdade ("seg"), que é o que cabe num seletor de 7 colunas.
            abreviado: format(dia, 'EEEEEE', { locale: ptBR }),
            diaMes: format(dia, 'dd/MM'),
            valor: format(dia, 'yyyy-MM-dd'),
            ehHoje: isSameDay(dia, hoje),
        };
    });
}

export function calcularDataInicioSemana(data: Date) {
    return startOfWeek(data, { weekStartsOn: 1 });
}
