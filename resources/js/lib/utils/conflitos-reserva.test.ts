import { Agenda } from '@/types';
import { agendaIdDaLinha, datasEmConflito, recorrenciaParaGravar, slotsEmConflito } from './conflitos-reserva';

const agendas: Agenda[] = [
    {
        id: 10,
        turno: 'manha',
        horarios: [
            { id: 1, data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', situacao: 'deferida' },
            { id: 2, data: '2026-08-26', horario_inicio: '10:00:00', horario_fim: '11:00:00', situacao: 'em_analise' },
        ],
    },
];

describe('agendaIdDaLinha', () => {
    it('prefere agenda_id e cai para agenda.id quando ausente', () => {
        expect(agendaIdDaLinha({ agenda_id: 3 })).toBe(3);
        expect(agendaIdDaLinha({ agenda: { id: 7 } })).toBe(7);
        expect(agendaIdDaLinha({})).toBeUndefined();
    });
});

describe('datasEmConflito', () => {
    it('retorna as datas formatadas dd/MM/yyyy onde há sobreposição com horário deferido', () => {
        const datas = datasEmConflito(
            [
                { data: '2026-08-25', horario_inicio: '08:30:00', horario_fim: '09:30:00', agenda_id: 10 },
                { data: '2026-08-27', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 10 },
            ],
            agendas,
        );

        expect(datas).toEqual(['25/08/2026']);
    });

    it('ignora horários que apenas estão em análise', () => {
        expect(datasEmConflito([{ data: '2026-08-26', horario_inicio: '10:00:00', horario_fim: '11:00:00', agenda_id: 10 }], agendas)).toEqual([]);
    });

    it('não considera agendas diferentes', () => {
        expect(datasEmConflito([{ data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 99 }], agendas)).toEqual([]);
    });

    it('não acusa conflito em horários encostados (fim igual ao início)', () => {
        expect(datasEmConflito([{ data: '2026-08-25', horario_inicio: '09:00:00', horario_fim: '10:00:00', agenda_id: 10 }], agendas)).toEqual([]);
    });
});

describe('recorrenciaParaGravar', () => {
    it('usa a recorrência informada, exceto na edição de semana única', () => {
        expect(recorrenciaParaGravar('15dias', false)).toBe('15dias');
        expect(recorrenciaParaGravar('15dias', true)).toBe('unica');
    });
});

describe('slotsEmConflito', () => {
    it('marca o slot que colide na própria data', () => {
        const ids = slotsEmConflito({
            slots: [
                { id: 'a', status: 'selecionado', data: new Date(2026, 7, 25), horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 10 },
                { id: 'b', status: 'selecionado', data: new Date(2026, 7, 25), horario_inicio: '12:00:00', horario_fim: '13:00:00', agenda_id: 10 },
            ],
            agendas,
            recorrencia: 'unica',
            dataFinal: new Date(2026, 7, 25),
        });

        expect(ids).toEqual(['a']);
    });

    it('marca o slot cuja ocorrência futura da recorrência colide', () => {
        const ids = slotsEmConflito({
            slots: [
                {
                    id: 'semanal',
                    status: 'selecionado',
                    data: new Date(2026, 7, 18),
                    horario_inicio: '08:00:00',
                    horario_fim: '09:00:00',
                    agenda_id: 10,
                },
            ],
            agendas,
            recorrencia: '15dias',
            dataFinal: new Date(2026, 7, 31),
        });

        expect(ids).toEqual(['semanal']);
    });

    it('retorna vazio quando o espaço não tem horários deferidos para a agenda do slot', () => {
        const ids = slotsEmConflito({
            slots: [
                { id: 'x', status: 'selecionado', data: new Date(2026, 7, 25), horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 99 },
            ],
            agendas,
            recorrencia: 'unica',
            dataFinal: new Date(2026, 7, 25),
        });

        expect(ids).toEqual([]);
    });
});
