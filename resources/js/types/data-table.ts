import type { ComponentType, ReactNode } from 'react';

export type ColumnAlign = 'left' | 'center' | 'right';

export interface ColumnDef<T> {
    id?: string;
    header: string | ReactNode;
    accessorKey?: keyof T;
    cell?: (item: T, index: number) => ReactNode;
    className?: string;
    align?: ColumnAlign;
    width?: string;
    enableHiding?: boolean;
    enableSorting?: boolean;
    sortKey?: string;
}

export interface BulkAction<T> {
    id: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
    requiresConfirmation?: boolean;
    confirmationTitle?: string;
    confirmationDescription?: string;
    action: (selectedItems: T[]) => void | Promise<void>;
}

export interface DataTablePaginationProps {
    links?: { url?: string | null; label: string; active?: boolean }[];
    meta?: object;
}

export interface DataTableEmptyStateProps {
    title?: string;
    description?: string;
    action?: ReactNode;
}

export interface DataTableProps<T> {
    data: T[];
    columns: ColumnDef<T>[];
    keyExtractor?: (item: T, index: number) => string | number;
    actions?: (item: T, index: number) => ReactNode;
    actionsHeader?: string;
    actionsAlign?: ColumnAlign;
    actionsWidth?: string;
    viewMode?: 'table' | 'grid';
    renderCard?: (item: T, index: number, isSelected?: boolean, toggleSelection?: () => void) => ReactNode;
    gridClassName?: string;
    pagination?: DataTablePaginationProps;
    emptyState?: DataTableEmptyStateProps;
    cardWrapper?: boolean;
    cardTitle?: string;
    cardDescription?: string;
    cardHeaderAction?: ReactNode;
    className?: string;

    // Recursos inteligentes Fase 5
    autoCardViewOnMobile?: boolean;
    selectable?: boolean;
    selectedItems?: T[];
    onSelectionChange?: (items: T[]) => void;
    bulkActions?: BulkAction<T>[];
    enableColumnVisibility?: boolean;
    visibleColumns?: string[];
    onVisibleColumnsChange?: (columns: string[]) => void;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
    toolbarAction?: ReactNode;
}
