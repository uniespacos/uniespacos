import { render, screen } from '@testing-library/react';
import type { ConflictInfo } from '@/types';
import { ConflictAlertBox } from './ConflictAlertBox';

describe('ConflictAlertBox', () => {
    it('renders conflict list when conflictCache has entries', () => {
        const mockConflicts: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 100,
                conflito_reserva_titulo: 'Aula de Yoga',
                conflito_user_name: 'João Silva',
            },
            '2': {
                horario_checado_id: 101,
                conflito_reserva_titulo: 'Reunião de Equipe',
                conflito_user_name: 'Maria Santos',
            },
        };

        render(<ConflictAlertBox conflictCache={mockConflicts} />);

        expect(screen.getByText(/Atenção:/i)).toBeInTheDocument();
        expect(screen.getByText('Aula de Yoga')).toBeInTheDocument();
        expect(screen.getByText(/João Silva/)).toBeInTheDocument();
        expect(screen.getByText('Reunião de Equipe')).toBeInTheDocument();
        expect(screen.getByText(/Maria Santos/)).toBeInTheDocument();
    });

    it('renders nothing when conflictCache is null', () => {
        const { container } = render(<ConflictAlertBox conflictCache={null} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing when conflictCache is empty object', () => {
        const { container } = render(<ConflictAlertBox conflictCache={{}} />);
        expect(container.firstChild).toBeNull();
    });
});
