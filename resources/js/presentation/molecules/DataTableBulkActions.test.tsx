import { fireEvent, render, screen } from '@testing-library/react';
import type { BulkAction } from '@/types/data-table';
import { DataTableBulkActions } from './DataTableBulkActions';

interface TestItem {
    id: number;
    name: string;
}

const mockItems: TestItem[] = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
];

describe('DataTableBulkActions', () => {
    it('returns null when selectedCount is 0', () => {
        const { container } = render(
            <DataTableBulkActions
                selectedCount={0}
                actions={[{ id: 'delete', label: 'Excluir', action: jest.fn() }]}
                selectedItems={[]}
                onClearSelection={jest.fn()}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders selected count and triggers simple action', () => {
        const onAction = jest.fn();
        const onClear = jest.fn();
        const actions: BulkAction<TestItem>[] = [{ id: 'export', label: 'Exportar Selecionados', action: onAction }];

        render(<DataTableBulkActions selectedCount={2} actions={actions} selectedItems={mockItems} onClearSelection={onClear} />);

        expect(screen.getByText('2 selecionados')).toBeInTheDocument();
        const exportBtn = screen.getByRole('button', { name: /exportar selecionados/i });
        fireEvent.click(exportBtn);

        expect(onAction).toHaveBeenCalledWith(mockItems);

        const clearBtn = screen.getByRole('button', { name: /limpar seleção/i });
        fireEvent.click(clearBtn);
        expect(onClear).toHaveBeenCalled();
    });

    it('handles confirmation dialog for dangerous actions', () => {
        const onDelete = jest.fn();
        const actions: BulkAction<TestItem>[] = [
            {
                id: 'delete',
                label: 'Excluir em Lote',
                variant: 'destructive',
                requiresConfirmation: true,
                confirmationTitle: 'Excluir Registros',
                confirmationDescription: 'Tem certeza que deseja excluir os registros selecionados?',
                action: onDelete,
            },
        ];

        render(<DataTableBulkActions selectedCount={1} actions={actions} selectedItems={[mockItems[0]]} onClearSelection={jest.fn()} />);

        expect(screen.getByText('1 selecionado')).toBeInTheDocument();
        const deleteBtn = screen.getByRole('button', { name: /excluir em lote/i });
        fireEvent.click(deleteBtn);

        expect(screen.getByText('Excluir Registros')).toBeInTheDocument();
        expect(screen.getByText('Tem certeza que deseja excluir os registros selecionados?')).toBeInTheDocument();

        const confirmBtn = screen.getByRole('button', { name: 'Confirmar' });
        fireEvent.click(confirmBtn);

        expect(onDelete).toHaveBeenCalledWith([mockItems[0]]);
    });
});
