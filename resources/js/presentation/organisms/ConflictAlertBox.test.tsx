import type { ConflictInfo } from '@/types';
import { render, screen } from '@testing-library/react';
import { ConflictAlertBox } from './ConflictAlertBox';

describe('ConflictAlertBox', () => {
    it('renders conflict list when conflicts has entries', () => {
        const mockConflicts: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 100,
                conflito_reserva_titulo: 'Aula de Yoga',
            },
            '2': {
                horario_checado_id: 101,
                conflito_reserva_titulo: 'Reunião de Equipe',
            },
        };

        render(<ConflictAlertBox conflicts={mockConflicts} />);

        expect(screen.getByText(/Atenção:/i)).toBeInTheDocument();
        expect(screen.getByText('Aula de Yoga')).toBeInTheDocument();
        expect(screen.getByText('Reunião de Equipe')).toBeInTheDocument();
    });

    it('renders nothing when conflicts is null', () => {
        const { container } = render(<ConflictAlertBox conflicts={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when conflicts is empty object', () => {
        const { container } = render(<ConflictAlertBox conflicts={{}} />);
        expect(container.firstChild).toBeNull();
    });

    it('mostra o titulo do conflito e a nota de bloqueio', () => {
        const mockConflicts: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 100,
                conflito_reserva_titulo: 'Seminário Institucional',
            },
        };

        render(<ConflictAlertBox conflicts={mockConflicts} />);

        expect(screen.getByText('Seminário Institucional')).toBeInTheDocument();
        expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
        expect(
            screen.getByText(
                'Horários com conflito contra outra reserva deferida ficam bloqueados para aprovação e são indeferidos automaticamente ao salvar a avaliação.',
            ),
        ).toBeInTheDocument();
    });
});
