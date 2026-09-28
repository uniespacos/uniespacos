import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ColumnDef } from '@/types/data-table';
import { SlidersHorizontal } from 'lucide-react';

export interface DataTableViewOptionsProps<T> {
    columns: ColumnDef<T>[];
    visibleColumns: string[];
    onToggleColumn: (columnId: string) => void;
    className?: string;
}

export function DataTableViewOptions<T>({ columns, visibleColumns, onToggleColumn, className }: DataTableViewOptionsProps<T>) {
    const hideableColumns = columns
        .map((col, index) => {
            const id = col.id ?? (col.accessorKey ? String(col.accessorKey) : `col_${String(index)}`);
            const label = typeof col.header === 'string' ? col.header : id;
            return {
                id,
                label,
                enableHiding: col.enableHiding,
            };
        })
        .filter((col) => col.enableHiding !== false);

    if (hideableColumns.length === 0) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8 gap-1.5 text-xs', className)}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Colunas</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-card w-48">
                <DropdownMenuLabel className="text-xs">Alternar Colunas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hideableColumns.map((col) => {
                    const isChecked = visibleColumns.includes(col.id);
                    return (
                        <DropdownMenuCheckboxItem
                            key={col.id}
                            className="text-xs capitalize"
                            checked={isChecked}
                            onCheckedChange={() => {
                                onToggleColumn(col.id);
                            }}
                        >
                            {col.label}
                        </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default DataTableViewOptions;
