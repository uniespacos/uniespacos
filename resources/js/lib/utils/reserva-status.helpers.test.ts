import { SituacaoHorario, SituacaoReserva } from '@/contracts';
import { type SlotCalendario } from '@/types';
import { mapearStatusBackendParaSlot, verificarStatusReserva } from './reserva-status.helpers';

function criarSlot(status: SlotCalendario['status'], isLocked = false): SlotCalendario {
    return {
        id: `2026-11-24|08:20:00|${status}`,
        status,
        data: new Date(2026, 10, 24),
        horario_inicio: '08:20:00',
        horario_fim: '09:10:00',
        isLocked,
    };
}

describe('reserva-status.helpers', () => {
    describe('mapearStatusBackendParaSlot', () => {
        it('mapeia cada SituacaoHorario para o status do slot correspondente', () => {
            expect(mapearStatusBackendParaSlot(SituacaoHorario.EM_ANALISE)).toBe('solicitado');
            expect(mapearStatusBackendParaSlot(SituacaoHorario.DEFERIDA)).toBe(SituacaoReserva.DEFERIDA);
            expect(mapearStatusBackendParaSlot(SituacaoHorario.INDEFERIDA)).toBe(SituacaoReserva.INDEFERIDA);
            expect(mapearStatusBackendParaSlot(SituacaoHorario.INATIVA)).toBe('reservado');
        });
    });

    describe('verificarStatusReserva', () => {
        it('retorna em_analise quando nao ha slots', () => {
            expect(verificarStatusReserva([])).toBe(SituacaoReserva.EM_ANALISE);
        });

        it('retorna deferida quando todos os slots estao deferidos', () => {
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.DEFERIDA), criarSlot(SituacaoReserva.DEFERIDA)])).toBe(
                SituacaoReserva.DEFERIDA,
            );
        });

        it('retorna indeferida quando todos os slots estao indeferidos', () => {
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.INDEFERIDA), criarSlot(SituacaoReserva.INDEFERIDA)])).toBe(
                SituacaoReserva.INDEFERIDA,
            );
        });

        it('retorna em_analise quando ha mistura de deferido e em analise', () => {
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.DEFERIDA), criarSlot('solicitado')])).toBe(
                SituacaoReserva.EM_ANALISE,
            );
        });

        it('retorna parcialmente_deferida quando todos foram avaliados com mistura de deferida e indeferida', () => {
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.DEFERIDA), criarSlot(SituacaoReserva.INDEFERIDA)])).toBe(
                SituacaoReserva.PARCIALMENTE_DEFERIDA,
            );
        });

        it('considera slots travados por conflito como indeferidos no calculo agregado', () => {
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.DEFERIDA), criarSlot(SituacaoReserva.INDEFERIDA, true)])).toBe(
                SituacaoReserva.PARCIALMENTE_DEFERIDA,
            );
            expect(verificarStatusReserva([criarSlot(SituacaoReserva.INDEFERIDA, true)])).toBe(SituacaoReserva.INDEFERIDA);
        });

        it('retorna inativa quando todos os slots estao inativos (reservado)', () => {
            expect(verificarStatusReserva([criarSlot('reservado'), criarSlot('reservado')])).toBe(SituacaoReserva.INATIVA);
        });
    });
});
