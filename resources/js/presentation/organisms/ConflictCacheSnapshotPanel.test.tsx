import type { ConflictInfo } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConflictCacheSnapshotPanel } from './ConflictCacheSnapshotPanel';

describe('ConflictCacheSnapshotPanel', () => {
    it('nao renderiza quando snapshot e null ou vazio', () => {
        const { container: cNull } = render(<ConflictCacheSnapshotPanel snapshot={null} />);
        expect(cNull.firstChild).toBeNull();

        const { container: cEmpty } = render(<ConflictCacheSnapshotPanel snapshot={{}} />);
        expect(cEmpty.firstChild).toBeNull();
    });

    it('omite solicitante quando conflito_user_name esta ausente ao expandir', () => {
        const snapshot: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 10,
                conflito_reserva_titulo: 'Aula de Cálculo',
            },
        };

        render(<ConflictCacheSnapshotPanel snapshot={snapshot} />);

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Aula de Cálculo')).toBeInTheDocument();
        expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Solicitante:/i)).not.toBeInTheDocument();
    });

    it('exibe solicitante quando conflito_user_name esta preenchido', () => {
        const snapshot: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 10,
                conflito_reserva_titulo: 'Reunião Departamental',
                conflito_user_name: 'Ana Paula',
            },
        };

        render(<ConflictCacheSnapshotPanel snapshot={snapshot} />);

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Reunião Departamental')).toBeInTheDocument();
        expect(screen.getByText(/Ana Paula/)).toBeInTheDocument();
    });
});
