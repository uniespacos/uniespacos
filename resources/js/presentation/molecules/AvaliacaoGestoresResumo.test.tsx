import type { Horario, User } from '@/types';
import { render, screen } from '@testing-library/react';
import AvaliacaoGestoresResumo from './AvaliacaoGestoresResumo';

const criarHorario = (id: number, situacao: Horario['situacao'], avaliadorNome?: string): Horario =>
    ({
        id,
        data: '2026-10-10',
        horario_inicio: '08:00:00',
        horario_fim: '09:00:00',
        situacao,
        validation_status: 'completed',
        conflict_cache: null,
        avaliador: avaliadorNome ? ({ id: 9, name: avaliadorNome } as User) : undefined,
        agenda: {
            id: 1,
            turno: 'manha',
            user: { id: 2, name: 'Gestor Manhã' } as User,
        },
    }) as unknown as Horario;

describe('AvaliacaoGestoresResumo', () => {
    it('exibe Deferida em verde quando todos os horários da agenda foram deferidos', () => {
        const horarios = [criarHorario(1, 'deferida', 'Ana Gestora'), criarHorario(2, 'deferida', 'Ana Gestora')];

        render(<AvaliacaoGestoresResumo horarios={horarios} />);

        const status = screen.getByText('Deferida (Ana Gestora)');
        expect(status).toBeInTheDocument();
        expect(status).toHaveClass('text-success-accent');
    });

    it('exibe Indeferida em estilo destrutivo quando todos os horários da agenda foram indeferidos', () => {
        const horarios = [criarHorario(1, 'indeferida', 'Ana Gestora'), criarHorario(2, 'indeferida', 'Ana Gestora')];

        render(<AvaliacaoGestoresResumo horarios={horarios} />);

        const status = screen.getByText('Indeferida (Ana Gestora)');
        expect(status).toBeInTheDocument();
        expect(status).toHaveClass('text-destructive-accent');
    });

    it('exibe Parcialmente deferida — X/Y em âmbar quando há horários deferidos e indeferidos', () => {
        const horarios = [criarHorario(1, 'deferida', 'Ana Gestora'), criarHorario(2, 'indeferida', 'Ana Gestora')];

        render(<AvaliacaoGestoresResumo horarios={horarios} />);

        const status = screen.getByText('Parcialmente deferida — 1/2 (Ana Gestora)');
        expect(status).toBeInTheDocument();
        expect(status).toHaveClass('text-warning-accent');
    });

    it('exibe Em Análise — X/Y quando ainda há horários pendentes de avaliação', () => {
        const horarios = [criarHorario(1, 'deferida', 'Ana Gestora'), criarHorario(2, 'em_analise')];

        render(<AvaliacaoGestoresResumo horarios={horarios} />);

        const status = screen.getByText('Em Análise — 1/2');
        expect(status).toBeInTheDocument();
        expect(status).toHaveClass('text-warning-accent');
    });
});
