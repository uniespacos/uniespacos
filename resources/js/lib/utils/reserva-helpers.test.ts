import { Horario, Reserva, SituacaoReserva } from '@/types';
import { calculateGestorStatus, comSituacaoEfetivaDoGestor } from './reserva-helpers';

describe('reserva-helpers', () => {
    const mockReserva = (id: number, situacao: SituacaoReserva, horarios: Partial<Horario>[] = []): Reserva => ({
        id,
        titulo: 'Reserva ' + String(id),
        descricao: 'Teste',
        situacao,
        data_inicial: new Date(),
        data_final: new Date(),
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
            const res = mockReserva(1, 'deferida', [{ situacao: 'deferida' }, { situacao: 'indeferida' }]);
            expect(calculateGestorStatus(res)).toBe('parcialmente_deferida');
        });
    });

    describe('comSituacaoEfetivaDoGestor', () => {
        it('recalcula a situacao de cada reserva sem alterar a ordem da lista', () => {
            const r1 = mockReserva(1, 'deferida', [{ situacao: 'deferida' }]);
            const r2 = mockReserva(2, 'parcialmente_deferida', [{ situacao: 'em_analise' }, { situacao: 'deferida' }]);
            const r3 = mockReserva(3, 'indeferida', [{ situacao: 'indeferida' }]);

            const resultado = comSituacaoEfetivaDoGestor([r1, r2, r3]);

            expect(resultado.map((r) => r.id)).toEqual([1, 2, 3]);
            expect(resultado[1].situacao).toBe('em_analise');
        });
    });
});
