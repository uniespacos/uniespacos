import type { Agenda } from '@/types';
import { render, screen } from '@testing-library/react';
import { GestoresEspaco } from './GestoresEspaco';

const agenda = (id: number, turno: Agenda['turno'], nomeGestor?: string): Agenda => ({
    id,
    turno,
    ...(nomeGestor ? { user: { id, name: nomeGestor, email: `${nomeGestor}@uesb.edu.br` } as Agenda['user'] } : {}),
});

const turnosRenderizados = (): string[] => screen.getAllByTestId('turno-label').map((el) => el.textContent ?? '');

describe('GestoresEspaco', () => {
    it('renders shifts as Manhã, Tarde, Noite regardless of the order received', () => {
        render(<GestoresEspaco agendas={[agenda(3, 'noite', 'Carlos'), agenda(1, 'manha', 'Ana'), agenda(2, 'tarde', 'Bruno')]} />);

        expect(turnosRenderizados()).toEqual(['Manhã', 'Tarde', 'Noite']);
    });

    it('keeps the order when the agendas arrive already sorted', () => {
        render(<GestoresEspaco agendas={[agenda(1, 'manha', 'Ana'), agenda(2, 'tarde', 'Bruno'), agenda(3, 'noite', 'Carlos')]} />);

        expect(turnosRenderizados()).toEqual(['Manhã', 'Tarde', 'Noite']);
    });

    it('renders all three shifts even when an agenda is missing', () => {
        render(<GestoresEspaco agendas={[agenda(1, 'manha', 'Ana')]} />);

        expect(turnosRenderizados()).toEqual(['Manhã', 'Tarde', 'Noite']);
        expect(screen.getAllByText('Sem gestor')).toHaveLength(2);
    });

    it('shows "Sem gestor" for an existing agenda with no manager assigned', () => {
        render(<GestoresEspaco agendas={[agenda(1, 'manha'), agenda(2, 'tarde', 'Bruno'), agenda(3, 'noite', 'Carlos')]} />);

        expect(turnosRenderizados()).toEqual(['Manhã', 'Tarde', 'Noite']);
        expect(screen.getAllByText('Sem gestor')).toHaveLength(1);
    });

    it('pairs each manager with their own shift', () => {
        render(<GestoresEspaco agendas={[agenda(3, 'noite', 'Carlos'), agenda(1, 'manha', 'Ana'), agenda(2, 'tarde', 'Bruno')]} />);

        const linhas = screen.getAllByTestId('turno-linha').map((el) => el.textContent ?? '');

        expect(linhas[0]).toContain('Manhã');
        expect(linhas[0]).toContain('Ana');
        expect(linhas[1]).toContain('Tarde');
        expect(linhas[1]).toContain('Bruno');
        expect(linhas[2]).toContain('Noite');
        expect(linhas[2]).toContain('Carlos');
    });

    it('falls back to "Nenhum gestor" when the space has no agendas at all', () => {
        const { rerender } = render(<GestoresEspaco agendas={[]} />);
        expect(screen.getByText('Nenhum gestor')).toBeInTheDocument();
        expect(screen.queryAllByTestId('turno-label')).toHaveLength(0);

        rerender(<GestoresEspaco agendas={undefined} />);
        expect(screen.getByText('Nenhum gestor')).toBeInTheDocument();
    });
});
