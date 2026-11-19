import { RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import { expandirHorariosRecorrencia, type HorarioRecorrenciaEntrada } from './expandir-horarios-recorrencia';

const MANHA: readonly [string, string] = ['07:30:00', '08:20:00'];
const TARDE: readonly [string, string] = ['13:10:00', '14:00:00'];
const NOITE: readonly [string, string] = ['18:20:00', '19:10:00'];

const T1 = '2026-11-24';
const Q1 = '2026-11-26';
const T2 = '2026-12-01';
const T3 = '2026-12-08';
const T4 = '2026-12-15';
const T5 = '2026-12-22';

const FINAL_15_DIAS_08_12 = '2026-12-08';
const FINAL_1_MES_24_12 = '2026-12-24';

function slot(data: string, turno: readonly [string, string], agendaId = 1): HorarioRecorrenciaEntrada {
    return { data, horario_inicio: turno[0], horario_fim: turno[1], agenda_id: agendaId };
}

describe('expandirHorariosRecorrencia', () => {
    describe('unica', () => {
        it('apenas deduplica os slots sem repetir datas', () => {
            const resultado = expandirHorariosRecorrencia(
                [slot(T1, MANHA), slot(T3, MANHA), slot(T1, MANHA), slot(T3, MANHA)],
                RecorrenciaReserva.UNICA,
                FINAL_1_MES_24_12,
            );

            expect(resultado).toHaveLength(2);
            expect(resultado.map((h) => h.data)).toEqual([T1, T3]);
        });

        it('ignora a data final quando a recorrencia e unica', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA)], RecorrenciaReserva.UNICA, FINAL_1_MES_24_12);

            expect(resultado).toEqual([{ data: T1, horario_inicio: MANHA[0], horario_fim: MANHA[1], agenda_id: 1 }]);
        });

        it('mantem o slot clicado sem expandir quando a data final e ausente', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA)], RecorrenciaReserva.QUINZE_DIAS, null);

            expect(resultado.map((h) => h.data)).toEqual([T1]);
        });
    });

    describe('15dias (final 08/12)', () => {
        it('D-01: T1 manha expande para 3 datas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA)], RecorrenciaReserva.QUINZE_DIAS, FINAL_15_DIAS_08_12);

            expect(resultado).toHaveLength(3);
            expect(resultado.map((h) => h.data)).toEqual([T1, '2026-12-01', T3]);
        });

        it('D-02: T1 com os tres turnos gera 9 linhas', () => {
            const resultado = expandirHorariosRecorrencia(
                [slot(T1, MANHA), slot(T1, TARDE), slot(T1, NOITE)],
                RecorrenciaReserva.QUINZE_DIAS,
                FINAL_15_DIAS_08_12,
            );

            expect(resultado).toHaveLength(9);
        });

        it('D-03: T1 manha + Q1 tarde gera 5 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(Q1, TARDE)], RecorrenciaReserva.QUINZE_DIAS, FINAL_15_DIAS_08_12);

            expect(resultado).toHaveLength(5);
        });

        it('D-04: T1 manha + T2 tarde gera 3 linhas (manha 1 + tarde 2)', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(T2, TARDE)], RecorrenciaReserva.QUINZE_DIAS, FINAL_15_DIAS_08_12);

            expect(resultado).toHaveLength(3);
            expect(resultado.filter((h) => h.horario_inicio === MANHA[0])).toHaveLength(1);
            expect(resultado.filter((h) => h.horario_inicio === TARDE[0])).toHaveLength(2);
        });

        it('D-05: T1 manha + T4 manha com final 15/12 gera 4 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(T4, MANHA)], RecorrenciaReserva.QUINZE_DIAS, T4);

            expect(resultado).toHaveLength(4);
            expect(resultado.map((h) => h.data)).toEqual([T1, '2026-12-01', T3, T4]);
        });

        it('C-05: T1 manha + T3 tarde gera 3 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(T3, TARDE)], RecorrenciaReserva.QUINZE_DIAS, FINAL_15_DIAS_08_12);

            expect(resultado).toHaveLength(3);
        });
    });

    describe('1mes (final 24/12)', () => {
        it('M-01: T1 manha gera 5 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA)], RecorrenciaReserva.UM_MES, FINAL_1_MES_24_12);

            expect(resultado).toHaveLength(5);
        });

        it('M-02: T1 manha + Q1 noite gera 10 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(Q1, NOITE)], RecorrenciaReserva.UM_MES, FINAL_1_MES_24_12);

            expect(resultado).toHaveLength(10);
        });

        it('M-03: T1 manha, T2 noite e T3 tarde geram 5 linhas', () => {
            const resultado = expandirHorariosRecorrencia(
                [slot(T1, MANHA), slot(T2, NOITE), slot(T3, TARDE)],
                RecorrenciaReserva.UM_MES,
                FINAL_1_MES_24_12,
            );

            expect(resultado).toHaveLength(5);
        });
    });

    describe('personalizado', () => {
        it('P-02: T1 manha + Q1 tarde com final 09/12 gera 5 linhas', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(Q1, TARDE)], RecorrenciaReserva.PERSONALIZADO, '2026-12-09');

            expect(resultado).toHaveLength(5);
        });

        it('P-05: T1 manha + T3 noite com final 22/12 gera 5 linhas (manha 2 + noite 3)', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA), slot(T3, NOITE)], RecorrenciaReserva.PERSONALIZADO, T5);

            expect(resultado).toHaveLength(5);
            expect(resultado.filter((h) => h.horario_inicio === MANHA[0])).toHaveLength(2);
            expect(resultado.filter((h) => h.horario_inicio === NOITE[0])).toHaveLength(3);
        });

        it('P-07: 4 horarios de 24/11 a 24/02/2027 geram 54 linhas', () => {
            const resultado = expandirHorariosRecorrencia(
                [slot(T1, TARDE), slot(T1, NOITE), slot(Q1, TARDE), slot(Q1, NOITE)],
                RecorrenciaReserva.PERSONALIZADO,
                '2027-02-24',
            );

            expect(resultado).toHaveLength(54);
        });

        it('aceita data final como Date local sem deslocamento de fuso', () => {
            const resultado = expandirHorariosRecorrencia([slot(T1, MANHA)], RecorrenciaReserva.PERSONALIZADO, new Date(2026, 11, 8));

            expect(resultado.map((h) => h.data)).toEqual([T1, '2026-12-01', T3]);
        });
    });

    describe('ordenacao e deduplicacao', () => {
        it('ordena por data e horario e nao duplica a mesma linha', () => {
            const resultado = expandirHorariosRecorrencia([slot(Q1, TARDE), slot(T1, NOITE), slot(T1, MANHA)], RecorrenciaReserva.UNICA, null);

            expect(resultado.map((h) => `${h.data} ${h.horario_inicio}`)).toEqual([`${T1} ${MANHA[0]}`, `${T1} ${NOITE[0]}`, `${Q1} ${TARDE[0]}`]);
        });

        it('ignora horarios sem data valida', () => {
            const resultado = expandirHorariosRecorrencia(
                [{ horario_inicio: MANHA[0], horario_fim: MANHA[1] }, slot('', MANHA)],
                RecorrenciaReserva.UNICA,
                null,
            );

            expect(resultado).toEqual([]);
        });
    });
});
