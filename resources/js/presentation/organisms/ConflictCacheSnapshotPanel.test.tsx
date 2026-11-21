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

    it('exibe o titulo de cada conflito ao expandir', () => {
        const snapshot: Record<string, ConflictInfo> = {
            '1': {
                horario_checado_id: 10,
                conflito_reserva_titulo: 'Aula de Cálculo',
            },
            '2': {
                horario_checado_id: 11,
                conflito_reserva_titulo: 'Reunião Departamental',
            },
        };

        render(<ConflictCacheSnapshotPanel snapshot={snapshot} />);

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Aula de Cálculo')).toBeInTheDocument();
        expect(screen.getByText('Reunião Departamental')).toBeInTheDocument();
        expect(screen.queryByText(/undefined/i)).not.toBeInTheDocument();
    });
});
