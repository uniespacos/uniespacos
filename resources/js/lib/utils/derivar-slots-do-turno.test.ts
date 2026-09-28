import { Agenda, AgendaDiasSemanaType, Horario, SlotCalendario } from '@/types';
import { derivarSlotsDoTurno } from './derivar-slots-do-turno';

describe('derivarSlotsDoTurno', () => {
    const SEGUNDA = new Date('2026-09-07T12:00:00');

    const diaSegunda: AgendaDiasSemanaType = {
        data: SEGUNDA,
        nome: 'Segunda-feira',
        abreviado: 'seg.',
        diaMes: '07/09',
        valor: 'seg',
        ehHoje: false,
    };

    function agendaManha(horarios: Horario[] = []): Agenda {
        return { id: 1, turno: 'manha', horarios };
    }

    function horarioDeferido(overrides: Partial<Horario> = {}): Horario {
        return {
            id: 10,
            data: '2026-09-07',
            horario_inicio: '07:30:00',
            horario_fim: '08:20:00',
            situacao: 'deferida',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            reserva: {
                id: 99,
                titulo: 'Aula de Cálculo',
                user: { id: 5, name: 'Maria' },
            } as never,
            ...overrides,
        };
    }

    function primeiroSlot(agenda: Agenda, slotsSolicitados?: SlotCalendario[], agora?: Date) {
        return derivarSlotsDoTurno(agenda, [diaSegunda], slotsSolicitados, agora)[0].slot;
    }

    it('marca como livre quando nao ha horario no banco', () => {
        const slot = primeiroSlot(agendaManha());

        expect(slot.status).toBe('livre');
        expect(slot.agenda_id).toBe(1);
    });

    it('marca como reservado um horario deferido de outra reserva', () => {
        const slot = primeiroSlot(agendaManha([horarioDeferido()]));

        expect(slot.status).toBe('reservado');
        expect(slot.dadosReserva?.autor).toBe('Maria');
        expect(slot.dadosReserva?.reserva_titulo).toBe('Aula de Cálculo');
    });

    it('usa Indefinido quando a reserva nao tem usuario', () => {
        const semUsuario = horarioDeferido({ reserva: { id: 99, titulo: 'Sem dono' } as never });
        const slot = primeiroSlot(agendaManha([semUsuario]));

        expect(slot.dadosReserva?.autor).toBe('Indefinido');
    });

    it('ignora horarios que nao estao deferidos', () => {
        const emAnalise = horarioDeferido({ situacao: 'em_analise' });
        const slot = primeiroSlot(agendaManha([emAnalise]));

        expect(slot.status).toBe('livre');
    });

    it('nao marca como reservado o horario da propria reserva em edicao', () => {
        const solicitados: SlotCalendario[] = [
            {
                id: '2026-09-07|07:30:00',
                status: 'solicitado',
                data: SEGUNDA,
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
                dadosReserva: { horarioDB: { reserva: { id: 99 } } } as never,
            },
        ];

        const slot = primeiroSlot(agendaManha([horarioDeferido()]), solicitados);

        expect(slot.status).toBe('solicitado');
    });

    it('slot solicitado prevalece sobre reservado de terceiro', () => {
        const deOutraReserva = horarioDeferido({ reserva: { id: 77, titulo: 'Outra' } as never });
        const solicitados: SlotCalendario[] = [
            {
                id: '2026-09-07|07:30:00',
                status: 'deferida',
                data: SEGUNDA,
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        const slot = primeiroSlot(agendaManha([deOutraReserva]), solicitados);

        expect(slot.status).toBe('deferida');
    });

    describe('isPast', () => {
        it('marca como passado quando o slot ja ocorreu', () => {
            const slot = primeiroSlot(agendaManha(), undefined, new Date('2026-09-08T00:00:00'));

            expect(slot.isPast).toBe(true);
        });

        it('nao marca como passado quando o slot ainda vai ocorrer', () => {
            const slot = primeiroSlot(agendaManha(), undefined, new Date('2026-09-01T00:00:00'));

            expect(slot.isPast).toBe(false);
        });
    });

    it('cobre todos os horarios do turno para cada dia da semana', () => {
        const diaTerca: AgendaDiasSemanaType = { ...diaSegunda, valor: 'ter', data: new Date('2026-09-08T12:00:00') };

        const derivados = derivarSlotsDoTurno(agendaManha(), [diaSegunda, diaTerca]);

        expect(derivados).toHaveLength(12);
        expect(new Set(derivados.map((d) => d.horaLabel)).size).toBe(6);
    });

    it('devolve vazio para turno sem horarios padrao', () => {
        const agenda = { id: 2, turno: 'madrugada', horarios: [] } as unknown as Agenda;

        expect(derivarSlotsDoTurno(agenda, [diaSegunda])).toEqual([]);
    });
});
