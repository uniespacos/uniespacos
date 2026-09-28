import { RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import type { OpcoesRecorrencia } from '@/types';
import { addDays, addMonths } from 'date-fns';

export * from '@/contracts/recorrencia.contract';

export const opcoesRecorrencia: OpcoesRecorrencia[] = [
    {
        valor: RecorrenciaReserva.UNICA,
        label: 'Apenas esta semana',
        descricao: 'A reserva será feita apenas para os dias selecionados nesta semana',
        calcularDataFinal: (dataInicial: Date) => addDays(dataInicial, 6),
    },
    {
        valor: RecorrenciaReserva.QUINZE_DIAS,
        label: 'Próximos 15 dias',
        descricao: 'A reserva será replicada pelos próximos 15 dias',
        calcularDataFinal: (dataInicial: Date) => addDays(dataInicial, 14),
    },
    {
        valor: RecorrenciaReserva.UM_MES,
        label: '1 mês',
        descricao: 'A reserva será replicada por 1 mês',
        calcularDataFinal: (dataInicial: Date) => addMonths(dataInicial, 1),
    },
    {
        valor: RecorrenciaReserva.PERSONALIZADO,
        label: 'Período personalizado',
        descricao: 'Defina um período personalizado para a recorrência',
        calcularDataFinal: (dataInicial: Date) => dataInicial,
    },
];
