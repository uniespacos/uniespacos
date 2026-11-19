import { SlotCalendario } from '@/types';
import {
    aplicarSelecaoDeSlots,
    chaveEstadoSlot,
    descricaoDiaSlot,
    ordenarSelecaoSlots,
    slotPodeSerSelecionado,
    slotsDoIntervaloShift,
} from './slot-calendario';

const SEGUNDA = new Date(2026, 8, 7, 12);
const TERCA = new Date(2026, 8, 8, 12);

function slot(overrides: Partial<SlotCalendario> & Pick<SlotCalendario, 'horario_inicio'>): SlotCalendario {
    const data = overrides.data ?? SEGUNDA;
    const dataIso = `${String(data.getFullYear())}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

    return {
        id: `${dataIso}|${overrides.horario_inicio}`,
        status: 'livre',
        data,
        horario_fim: '00:00:00',
        agenda_id: 1,
        isPast: false,
        isLocked: false,
        ...overrides,
    };
}

describe('slotPodeSerSelecionado', () => {
    it('aceita slot livre, futuro e desbloqueado', () => {
        expect(slotPodeSerSelecionado(slot({ horario_inicio: '07:30:00' }))).toBe(true);
    });

    it('recusa slot reservado, passado ou bloqueado', () => {
        expect(slotPodeSerSelecionado(slot({ horario_inicio: '07:30:00', status: 'reservado' }))).toBe(false);
        expect(slotPodeSerSelecionado(slot({ horario_inicio: '07:30:00', isPast: true }))).toBe(false);
        expect(slotPodeSerSelecionado(slot({ horario_inicio: '07:30:00', isLocked: true }))).toBe(false);
    });
});

describe('slotsDoIntervaloShift', () => {
    const manha = [
        slot({ horario_inicio: '07:30:00' }),
        slot({ horario_inicio: '08:20:00' }),
        slot({ horario_inicio: '09:10:00' }),
        slot({ horario_inicio: '10:00:00' }),
        slot({ horario_inicio: '10:50:00' }),
    ];

    it('retorna o intervalo entre âncora e alvo, incluindo ambos', () => {
        const resultado = slotsDoIntervaloShift(manha, manha[1], manha[3]);

        expect(resultado?.map((s) => s.horario_inicio)).toEqual(['08:20:00', '09:10:00', '10:00:00']);
    });

    it('funciona quando o alvo vem antes da âncora', () => {
        const resultado = slotsDoIntervaloShift(manha, manha[3], manha[1]);

        expect(resultado?.map((s) => s.horario_inicio)).toEqual(['08:20:00', '09:10:00', '10:00:00']);
    });

    it('ignora slots reservados, passados ou bloqueados dentro do intervalo', () => {
        const comBuracos = [
            slot({ horario_inicio: '07:30:00' }),
            slot({ horario_inicio: '08:20:00', status: 'reservado' }),
            slot({ horario_inicio: '09:10:00', isPast: true }),
            slot({ horario_inicio: '10:00:00', isLocked: true }),
            slot({ horario_inicio: '10:50:00' }),
        ];

        const resultado = slotsDoIntervaloShift(comBuracos, comBuracos[0], comBuracos[4]);

        expect(resultado?.map((s) => s.horario_inicio)).toEqual(['07:30:00', '10:50:00']);
    });

    it('retorna null quando os slots estão em dias diferentes', () => {
        const outroDia = slot({ horario_inicio: '09:10:00', data: TERCA });

        expect(slotsDoIntervaloShift([...manha, outroDia], manha[0], outroDia)).toBeNull();
    });

    it('retorna null quando a âncora não pertence à seção (outra agenda ou turno)', () => {
        const ancoraDeOutroTurno = slot({ horario_inicio: '07:30:00', id: 'outra-agenda', agenda_id: 2 });

        expect(slotsDoIntervaloShift(manha, ancoraDeOutroTurno, manha[2])).toBeNull();
    });

    it('retorna null quando a âncora ou o alvo não são selecionáveis', () => {
        const alvoReservado = slot({ horario_inicio: '09:10:00', status: 'reservado' });
        const seção = [...manha.slice(0, 2), alvoReservado];

        expect(slotsDoIntervaloShift(seção, seção[0], alvoReservado)).toBeNull();
        expect(slotsDoIntervaloShift(seção, alvoReservado, seção[0])).toBeNull();
    });
});

describe('aplicarSelecaoDeSlots', () => {
    const a = slot({ horario_inicio: '07:30:00' });
    const b = slot({ horario_inicio: '08:20:00' });
    const c = slot({ horario_inicio: '09:10:00', status: 'reservado' });

    it('seleciona os elegíveis que ainda não estavam selecionados, em ordem', () => {
        const resultado = aplicarSelecaoDeSlots([b], [a, b, c], true);

        expect(resultado.map((s) => s.id)).toEqual([a.id, b.id]);
    });

    it('devolve a mesma referência quando nada muda', () => {
        const atual = [a];

        expect(aplicarSelecaoDeSlots(atual, [a], true)).toBe(atual);
    });

    it('remove os elegíveis e preserva os demais selecionados', () => {
        const passado = slot({ horario_inicio: '06:00:00', isPast: true });

        const resultado = aplicarSelecaoDeSlots([a, b, passado], [a, b], false);

        expect(resultado.map((s) => s.id)).toEqual([passado.id]);
    });

    it('nunca seleciona slot reservado, mesmo em lote', () => {
        const resultado = aplicarSelecaoDeSlots([], [c], true);

        expect(resultado).toEqual([]);
    });
});

describe('ordenarSelecaoSlots', () => {
    it('ordena por data e depois por horário de início', () => {
        const tarde = slot({ horario_inicio: '13:10:00', data: SEGUNDA });
        const terca = slot({ horario_inicio: '07:30:00', data: TERCA });
        const manha = slot({ horario_inicio: '07:30:00', data: SEGUNDA });

        expect(ordenarSelecaoSlots([terca, tarde, manha]).map((s) => s.id)).toEqual([manha.id, tarde.id, terca.id]);
    });
});

describe('descricaoDiaSlot', () => {
    it('devolve o dia da semana com inicial maiúscula e o dia/mês', () => {
        expect(descricaoDiaSlot(new Date(2026, 10, 19, 12))).toBe('Quinta-feira, 19/11');
    });
});

describe('chaveEstadoSlot', () => {
    it('prioriza selecionado sobre o status do slot', () => {
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00' }), true)).toBe('agenda.slot.estado.selecionado');
    });

    it('marca slot livre passado como encerrado', () => {
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00', isPast: true }), false)).toBe('agenda.slot.estado.encerrado');
    });

    it('mapeia cada status de slot para a sua chave', () => {
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00', status: 'reservado' }), false)).toBe('agenda.slot.estado.reservado');
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00', status: 'solicitado' }), false)).toBe('agenda.slot.estado.solicitado');
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00', status: 'deferida' }), false)).toBe('agenda.slot.estado.deferida');
        expect(chaveEstadoSlot(slot({ horario_inicio: '07:30:00', status: 'indeferida' }), false)).toBe('agenda.slot.estado.indeferida');
    });
});
