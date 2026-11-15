import { RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import type { OpcoesRecorrencia } from '@/types';
import { addDays, addMonths } from 'date-fns';

export * from '@/contracts/recorrencia.contract';

export const opcoesRecorrencia: OpcoesRecorrencia[] = [
    {
        valor: RecorrenciaReserva.UNICA,
        labelKey: 'reservas.recorrencia.unica',
        descricaoKey: 'reservas.recorrencia.unica_desc',
        calcularDataFinal: (dataInicial: Date) => addDays(dataInicial, 6),
    },
    {
        valor: RecorrenciaReserva.QUINZE_DIAS,
        labelKey: 'reservas.recorrencia.quinze_dias',
        descricaoKey: 'reservas.recorrencia.quinze_dias_desc',
        calcularDataFinal: (dataInicial: Date) => addDays(dataInicial, 14),
    },
    {
        valor: RecorrenciaReserva.UM_MES,
        labelKey: 'reservas.recorrencia.um_mes',
        descricaoKey: 'reservas.recorrencia.um_mes_desc',
        calcularDataFinal: (dataInicial: Date) => addMonths(dataInicial, 1),
    },
    {
        valor: RecorrenciaReserva.PERSONALIZADO,
        labelKey: 'reservas.recorrencia.personalizado',
        descricaoKey: 'reservas.recorrencia.personalizado_desc',
        calcularDataFinal: (dataInicial: Date) => dataInicial,
    },
];
