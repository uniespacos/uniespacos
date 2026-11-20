import { SituacaoHorario, SituacaoReserva, type SituacaoReservaType } from '@/contracts';
import { Horario, Reserva } from '@/types';
import { calculateGestorStatus, comSituacaoEfetivaDoGestor } from './reserva-helpers';

describe('reserva-helpers', () => {
    const mockReserva = (id: number, situacao: SituacaoReservaType, horarios: Partial<Horario>[] = []): Reserva => ({
        id,
        titulo: 'Reserva ' + String(id),
        descricao: 'Teste',
        situacao,
        data_inicial: new Date(2026, 10, 19),
        data_final: new Date(2026, 10, 19),
        recorrencia: 'unica',
        observacao: null,
        created_at: '',
        updated_at: '',
        horarios: horarios as Horario[],
    });

    describe('calculateGestorStatus', () => {
        it('should return original status if it is not em_analise or parcialmente_deferida', () => {
            const res = mockReserva(1, 'deferida');
            expect(calculateGestorStatus(res)).toBe('deferida');
        });

        it('should return original status if horarios is empty', () => {
            const res = mockReserva(1, 'em_analise', []);
            expect(calculateGestorStatus(res)).toBe('em_analise');
        });

        it('should return em_analise if any horario is em_analise', () => {
            const res = mockReserva(1, 'parcialmente_deferida', [{ situacao: 'deferida' }, { situacao: 'em_analise' }]);
            expect(calculateGestorStatus(res)).toBe('em_analise');
        });

        it('should return deferida if all horarios are deferida', () => {
            const res = mockReserva(1, 'parcialmente_deferida', [{ situacao: 'deferida' }, { situacao: 'deferida' }]);
            expect(calculateGestorStatus(res)).toBe('deferida');
        });

        it('should return indeferida if all horarios are indeferida', () => {
            const res = mockReserva(1, 'parcialmente_deferida', [{ situacao: 'indeferida' }, { situacao: 'indeferida' }]);
            expect(calculateGestorStatus(res)).toBe('indeferida');
        });

        it('should return parcialmente_deferida if there is a mix of deferida and indeferida', () => {
            const res = mockReserva(1, SituacaoReserva.DEFERIDA, [
                { situacao: SituacaoHorario.DEFERIDA },
                { situacao: SituacaoHorario.INDEFERIDA },
            ]);
            expect(calculateGestorStatus(res)).toBe(SituacaoReserva.PARCIALMENTE_DEFERIDA);
        });

        it('deve retornar inativa quando a reserva esta cancelada mesmo com horarios inativos', () => {
            const res = mockReserva(1, SituacaoReserva.INATIVA, [
                { situacao: SituacaoHorario.INATIVA },
                { situacao: SituacaoHorario.INATIVA },
            ]);
            expect(calculateGestorStatus(res)).toBe(SituacaoReserva.INATIVA);
        });

        it('deve retornar inativa quando todos os horarios estao inativos', () => {
            const res = mockReserva(1, SituacaoReserva.DEFERIDA, [
                { situacao: SituacaoHorario.INATIVA },
                { situacao: SituacaoHorario.INATIVA },
            ]);
            expect(calculateGestorStatus(res)).toBe(SituacaoReserva.INATIVA);
        });
    });

    describe('comSituacaoEfetivaDoGestor', () => {
        it('recalcula a situacao de cada reserva sem alterar a ordem da lista e preserva inativa', () => {
            const r1 = mockReserva(1, SituacaoReserva.DEFERIDA, [{ situacao: SituacaoHorario.DEFERIDA }]);
            const r2 = mockReserva(2, SituacaoReserva.PARCIALMENTE_DEFERIDA, [
                { situacao: SituacaoHorario.EM_ANALISE },
                { situacao: SituacaoHorario.DEFERIDA },
            ]);
            const r3 = mockReserva(3, SituacaoReserva.INDEFERIDA, [{ situacao: SituacaoHorario.INDEFERIDA }]);
            const r4 = mockReserva(4, SituacaoReserva.INATIVA, [{ situacao: SituacaoHorario.INATIVA }]);

            const resultado = comSituacaoEfetivaDoGestor([r1, r2, r3, r4]);

            expect(resultado.map((r) => r.id)).toEqual([1, 2, 3, 4]);
            expect(resultado[1].situacao).toBe(SituacaoReserva.EM_ANALISE);
            expect(resultado[3].situacao).toBe(SituacaoReserva.INATIVA);
        });
    });
});
