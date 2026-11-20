import { agruparPeriodosPorDia } from './agrupar-periodos-por-dia';

describe('agruparPeriodosPorDia', () => {
    it('retorna lista vazia quando não há slots', () => {
        expect(agruparPeriodosPorDia([])).toEqual([]);
    });

    it('agrupa por dia em ordem cronológica e corta os segundos dos horários', () => {
        const grupos = agruparPeriodosPorDia([
            { data: new Date(2026, 10, 21), horario_inicio: '10:00:00', horario_fim: '11:00:00' },
            { data: new Date(2026, 10, 20), horario_inicio: '08:00:00', horario_fim: '09:00:00' },
        ]);

        expect(grupos.map((grupo) => grupo.chave)).toEqual(['2026-11-20', '2026-11-21']);
        expect(grupos[0]?.periodos).toEqual([{ inicio: '08:00', fim: '09:00' }]);
        expect(grupos[1]?.periodos).toEqual([{ inicio: '10:00', fim: '11:00' }]);
    });

    it('une períodos contíguos (fim de um igual ao início do próximo) num intervalo só', () => {
        const grupos = agruparPeriodosPorDia([
            { data: new Date(2026, 10, 20), horario_inicio: '13:10:00', horario_fim: '14:00:00' },
            { data: new Date(2026, 10, 20), horario_inicio: '14:00:00', horario_fim: '15:40:00' },
        ]);

        expect(grupos[0]?.periodos).toEqual([{ inicio: '13:10', fim: '15:40' }]);
    });

    it('une contíguos mesmo quando a entrada chega fora de ordem', () => {
        const grupos = agruparPeriodosPorDia([
            { data: new Date(2026, 10, 20), horario_inicio: '15:00:00', horario_fim: '15:40:00' },
            { data: new Date(2026, 10, 20), horario_inicio: '13:10:00', horario_fim: '15:00:00' },
        ]);

        expect(grupos[0]?.periodos).toEqual([{ inicio: '13:10', fim: '15:40' }]);
    });

    it('mantém separados os períodos que não são contíguos', () => {
        const grupos = agruparPeriodosPorDia([
            { data: new Date(2026, 10, 20), horario_inicio: '08:00:00', horario_fim: '09:00:00' },
            { data: new Date(2026, 10, 20), horario_inicio: '09:30:00', horario_fim: '10:30:00' },
        ]);

        expect(grupos[0]?.periodos).toEqual([
            { inicio: '08:00', fim: '09:00' },
            { inicio: '09:30', fim: '10:30' },
        ]);
    });

    it('não une períodos de dias diferentes que coincidem nos horários', () => {
        const grupos = agruparPeriodosPorDia([
            { data: new Date(2026, 10, 20), horario_inicio: '08:00:00', horario_fim: '09:00:00' },
            { data: new Date(2026, 10, 21), horario_inicio: '09:00:00', horario_fim: '10:00:00' },
        ]);

        expect(grupos).toHaveLength(2);
        expect(grupos[0]?.periodos).toEqual([{ inicio: '08:00', fim: '09:00' }]);
        expect(grupos[1]?.periodos).toEqual([{ inicio: '09:00', fim: '10:00' }]);
    });

    it('preserva a data local do grupo', () => {
        const grupos = agruparPeriodosPorDia([{ data: new Date(2026, 10, 20), horario_inicio: '08:00:00', horario_fim: '09:00:00' }]);

        expect(grupos[0]?.data).toEqual(new Date(2026, 10, 20));
    });
});
