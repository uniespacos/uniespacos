import { fireEvent, render, screen } from '@testing-library/react';
import type { BulkAction, ColumnDef } from '@/types/data-table';
import { DataTable } from './DataTable';

interface TestItem {
    id: number;
    nome: string;
    sigla: string;
}

const mockData: TestItem[] = [
    { id: 1, nome: 'Item Alfa', sigla: 'IA' },
    { id: 2, nome: 'Item Beta', sigla: 'IB' },
];

const mockColumns: ColumnDef<TestItem>[] = [
    { id: 'nome', header: 'Nome', accessorKey: 'nome', enableSorting: true },
    { id: 'sigla', header: 'Sigla', accessorKey: 'sigla' },
];

describe('DataTable', () => {
    it('renders column headers and cell values in desktop table mode', () => {
        render(<DataTable data={mockData} columns={mockColumns} />);

        expect(screen.getByText('Nome')).toBeInTheDocument();
        expect(screen.getByText('Sigla')).toBeInTheDocument();
        expect(screen.getByText('Item Alfa')).toBeInTheDocument();
        expect(screen.getByText('Item Beta')).toBeInTheDocument();
    });

    it('renders custom actions column when provided', () => {
        render(<DataTable data={mockData} columns={mockColumns} actions={(item) => <button type="button">Editar {item.sigla}</button>} />);

        expect(screen.getByText('Ações')).toBeInTheDocument();
        expect(screen.getByText('Editar IA')).toBeInTheDocument();
        expect(screen.getByText('Editar IB')).toBeInTheDocument();
    });

    it('renders grid cards when viewMode is grid and renderCard is passed', () => {
        render(<DataTable data={mockData} columns={mockColumns} viewMode="grid" renderCard={(item) => <div>Card Customizado: {item.nome}</div>} />);

        expect(screen.getByText('Card Customizado: Item Alfa')).toBeInTheDocument();
        expect(screen.getByText('Card Customizado: Item Beta')).toBeInTheDocument();
    });

    it('renders empty state when data array is empty', () => {
        render(
            <DataTable
                data={[]}
                columns={mockColumns}
                emptyState={{
                    title: 'Nenhum item cadastrado',
                    description: 'Cadastre seu primeiro item para visualizar aqui.',
                }}
            />,
        );

        expect(screen.getByText('Nenhum item cadastrado')).toBeInTheDocument();
        expect(screen.getByText('Cadastre seu primeiro item para visualizar aqui.')).toBeInTheDocument();
    });

    it('renders card title and description when cardWrapper is true', () => {
        render(<DataTable data={mockData} columns={mockColumns} cardTitle="Itens do Sistema" cardDescription="Listagem geral de itens" />);

        expect(screen.getByText('Itens do Sistema')).toBeInTheDocument();
        expect(screen.getByText('Listagem geral de itens')).toBeInTheDocument();
    });

    it('supports sorting when enableSorting is true', () => {
        const onSort = jest.fn();
        render(<DataTable data={mockData} columns={mockColumns} sortColumn="nome" sortDirection="asc" onSort={onSort} />);

        const sortButton = screen.getByRole('button', { name: /nome/i });
        fireEvent.click(sortButton);

        expect(onSort).toHaveBeenCalledWith('nome', 'desc');
    });

    it('supports row selection and renders bulk actions floating bar', () => {
        const onBulkAction = jest.fn();
        const bulkActions: BulkAction<TestItem>[] = [{ id: 'delete', label: 'Excluir Selecionados', action: onBulkAction }];

        render(<DataTable data={mockData} columns={mockColumns} selectable={true} bulkActions={bulkActions} />);

        const selectAllCheckbox = screen.getByLabelText(/selecionar todos os itens da página/i);
        expect(selectAllCheckbox).toBeInTheDocument();

        const row1Checkbox = screen.getByLabelText(/selecionar linha 1/i);
        fireEvent.click(row1Checkbox);

        expect(screen.getByText('1 selecionado')).toBeInTheDocument();
        const actionBtn = screen.getByRole('button', { name: /excluir selecionados/i });
        fireEvent.click(actionBtn);

        expect(onBulkAction).toHaveBeenCalledWith([mockData[0]]);
    });

    it('supports selecting and deselecting all items', () => {
        const bulkActions: BulkAction<TestItem>[] = [{ id: 'process', label: 'Processar', action: jest.fn() }];

        render(<DataTable data={mockData} columns={mockColumns} selectable={true} bulkActions={bulkActions} />);

        const selectAllCheckbox = screen.getByLabelText(/selecionar todos os itens da página/i);
        fireEvent.click(selectAllCheckbox);

        expect(screen.getByText('2 selecionados')).toBeInTheDocument();

        fireEvent.click(selectAllCheckbox);
        expect(screen.queryByText(/selecionados/i)).not.toBeInTheDocument();
    });

    it('supports column visibility toggle via DataTableViewOptions', () => {
        render(<DataTable data={mockData} columns={mockColumns} enableColumnVisibility={true} />);

        const columnsTrigger = screen.getByRole('button', { name: /colunas/i });
        expect(columnsTrigger).toBeInTheDocument();

        fireEvent.keyDown(columnsTrigger, { key: 'Enter' });
        expect(screen.getByText('Alternar Colunas')).toBeInTheDocument();
    });
});
