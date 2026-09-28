import { fireEvent, render, screen } from '@testing-library/react';
import type { ColumnDef } from '@/types/data-table';
import { DataTableViewOptions } from './DataTableViewOptions';

interface TestData {
    id: number;
    nome: string;
    sigla: string;
    descricao: string;
}

const columns: ColumnDef<TestData>[] = [
    { id: 'nome', header: 'Nome', accessorKey: 'nome' },
    { id: 'sigla', header: 'Sigla', accessorKey: 'sigla' },
    { id: 'descricao', header: 'Descrição', accessorKey: 'descricao', enableHiding: false },
];

describe('DataTableViewOptions', () => {
    it('renders trigger button and toggles columns visibility', () => {
        const onToggleColumn = jest.fn();
        render(<DataTableViewOptions columns={columns} visibleColumns={['nome', 'sigla', 'descricao']} onToggleColumn={onToggleColumn} />);

        const button = screen.getByRole('button', { name: /colunas/i });
        expect(button).toBeInTheDocument();

        // No Radix UI DropdownMenu, keyDown ArrowDown ou Enter abre o menu de forma confiável no JSDOM
        fireEvent.keyDown(button, { key: 'Enter' });

        expect(screen.getByText('Alternar Colunas')).toBeInTheDocument();
        expect(screen.getByText('Nome')).toBeInTheDocument();
        expect(screen.getByText('Sigla')).toBeInTheDocument();
        expect(screen.queryByText('Descrição')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('Nome'));
        expect(onToggleColumn).toHaveBeenCalledWith('nome');
    });

    it('returns null when there are no hideable columns', () => {
        const nonHideableColumns: ColumnDef<TestData>[] = [{ id: 'nome', header: 'Nome', enableHiding: false }];
        const { container } = render(<DataTableViewOptions columns={nonHideableColumns} visibleColumns={['nome']} onToggleColumn={jest.fn()} />);

        expect(container.firstChild).toBeNull();
    });
});
