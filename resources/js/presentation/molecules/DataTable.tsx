import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import DataTableBulkActions from '@/presentation/molecules/DataTableBulkActions';
import DataTableViewOptions from '@/presentation/molecules/DataTableViewOptions';
import PaginacaoListas from '@/presentation/molecules/PaginacaoListas';
import type { BulkAction, ColumnAlign, ColumnDef, DataTableEmptyStateProps, DataTablePaginationProps, DataTableProps } from '@/types/data-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

export type { BulkAction, ColumnAlign, ColumnDef, DataTableEmptyStateProps, DataTablePaginationProps, DataTableProps };

export function DataTable<T>({
    data,
    columns,
    keyExtractor,
    actions,
    actionsHeader = 'Ações',
    actionsAlign = 'right',
    actionsWidth,
    viewMode = 'table',
    renderCard,
    gridClassName = 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    pagination,
    emptyState,
    cardWrapper = true,
    cardTitle,
    cardDescription,
    cardHeaderAction,
    className,
    autoCardViewOnMobile = true,
    selectable = false,
    selectedItems: externalSelectedItems,
    onSelectionChange,
    bulkActions,
    enableColumnVisibility = false,
    visibleColumns: externalVisibleColumns,
    onVisibleColumnsChange,
    sortColumn,
    sortDirection,
    onSort,
    toolbarAction,
}: DataTableProps<T>) {
    const tableId = useId();
    const isMobile = useIsMobile();

    // --- Gerenciamento de Visibilidade de Colunas ---
    const allColumnIds = useMemo(() => {
        return columns.map((col, index) => col.id ?? (col.accessorKey ? String(col.accessorKey) : `col_${String(index)}`));
    }, [columns]);

    const [internalVisibleColumns, setInternalVisibleColumns] = useState<string[]>(allColumnIds);
    const visibleColumnIds = externalVisibleColumns ?? internalVisibleColumns;

    const handleToggleColumn = (columnId: string) => {
        const nextVisible = visibleColumnIds.includes(columnId) ? visibleColumnIds.filter((id) => id !== columnId) : [...visibleColumnIds, columnId];

        if (onVisibleColumnsChange) {
            onVisibleColumnsChange(nextVisible);
        } else {
            setInternalVisibleColumns(nextVisible);
        }
    };

    const activeColumns = useMemo(() => {
        return columns.filter((col, index) => {
            const id = col.id ?? (col.accessorKey ? String(col.accessorKey) : `col_${String(index)}`);
            return visibleColumnIds.includes(id);
        });
    }, [columns, visibleColumnIds]);

    // --- Gerenciamento de Seleção de Linhas ---
    const [internalSelectedItems, setInternalSelectedItems] = useState<T[]>([]);
    const selectedItems = externalSelectedItems ?? internalSelectedItems;

    const getRowKey = (item: T, index: number): string | number => {
        if (keyExtractor) return keyExtractor(item, index);
        if (
            typeof item === 'object' &&
            item !== null &&
            'id' in item &&
            (typeof (item as { id: unknown }).id === 'string' || typeof (item as { id: unknown }).id === 'number')
        ) {
            return (item as { id: string | number }).id;
        }
        return index;
    };

    const isItemSelected = (item: T, index: number): boolean => {
        const key = getRowKey(item, index);
        return selectedItems.some((selected, sIdx) => getRowKey(selected, sIdx) === key);
    };

    const handleToggleItem = (item: T, index: number) => {
        const key = getRowKey(item, index);
        const exists = selectedItems.some((selected, sIdx) => getRowKey(selected, sIdx) === key);
        let nextSelected: T[];

        if (exists) {
            nextSelected = selectedItems.filter((selected, sIdx) => getRowKey(selected, sIdx) !== key);
        } else {
            nextSelected = [...selectedItems, item];
        }

        if (onSelectionChange) {
            onSelectionChange(nextSelected);
        } else {
            setInternalSelectedItems(nextSelected);
        }
    };

    const isAllPageSelected = data.length > 0 && data.every((item, index) => isItemSelected(item, index));
    const isSomePageSelected = data.some((item, index) => isItemSelected(item, index)) && !isAllPageSelected;

    const handleToggleSelectAll = () => {
        let nextSelected: T[];
        if (isAllPageSelected) {
            const pageKeys = new Set(data.map((item, index) => getRowKey(item, index)));
            nextSelected = selectedItems.filter((item, index) => !pageKeys.has(getRowKey(item, index)));
        } else {
            const currentSelectedKeys = new Set(selectedItems.map((item, index) => getRowKey(item, index)));
            const itemsToAdd = data.filter((item, index) => !currentSelectedKeys.has(getRowKey(item, index)));
            nextSelected = [...selectedItems, ...itemsToAdd];
        }

        if (onSelectionChange) {
            onSelectionChange(nextSelected);
        } else {
            setInternalSelectedItems(nextSelected);
        }
    };

    const handleClearSelection = () => {
        if (onSelectionChange) {
            onSelectionChange([]);
        } else {
            setInternalSelectedItems([]);
        }
    };

    // --- Renderização de Célula e Alinhamento ---
    const renderCellContent = (column: ColumnDef<T>, item: T, index: number): ReactNode => {
        if (column.cell) {
            return column.cell(item, index);
        }
        if (column.accessorKey) {
            const val = item[column.accessorKey];
            if (val === null || val === undefined) return 'N/A';
            return String(val);
        }
        return null;
    };

    const getAlignmentClass = (align?: ColumnAlign) => {
        switch (align) {
            case 'center':
                return 'text-center';
            case 'right':
                return 'text-right';
            case 'left':
            default:
                return 'text-left';
        }
    };

    const totalColumns = activeColumns.length + (actions ? 1 : 0) + (selectable ? 1 : 0);

    const emptyContent = (
        <div className="flex flex-col items-center justify-center space-y-2 py-10 text-center">
            <p className="text-foreground font-medium">{emptyState?.title ?? 'Nenhum registro encontrado'}</p>
            {emptyState?.description && <p className="text-muted-foreground text-sm">{emptyState.description}</p>}
            {emptyState?.action && <div className="pt-2">{emptyState.action}</div>}
        </div>
    );

    // --- Toolbar Auxiliar ---
    const showToolbar = enableColumnVisibility || toolbarAction;
    const toolbarContent = showToolbar ? (
        <div className="flex items-center justify-between gap-2 pb-2">
            <div className="flex items-center gap-2">{toolbarAction}</div>
            <div className="flex items-center gap-2">
                {enableColumnVisibility && (
                    <DataTableViewOptions columns={columns} visibleColumns={visibleColumnIds} onToggleColumn={handleToggleColumn} />
                )}
            </div>
        </div>
    ) : null;

    // --- Renderização Padrão de Card (Fallback Inteligente para Mobile) ---
    const renderDefaultCard = (item: T, index: number) => {
        const isSelected = isItemSelected(item, index);
        const firstCol = activeColumns[0] as ColumnDef<T> | undefined;
        const otherCols = activeColumns.slice(1);

        return (
            <Card
                key={getRowKey(item, index)}
                className={cn(
                    'border-border/80 transition-all duration-200 hover:shadow-md',
                    isSelected && 'ring-primary/60 bg-primary/[0.02] ring-2',
                )}
            >
                <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            {selectable && (
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => {
                                        handleToggleItem(item, index);
                                    }}
                                    aria-label={`Selecionar item ${String(index + 1)}`}
                                    className="mt-0.5 shrink-0"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                {firstCol && (
                                    <div className="text-foreground truncate text-base font-semibold">{renderCellContent(firstCol, item, index)}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {otherCols.length > 0 && (
                        <div className="border-border/50 grid grid-cols-1 gap-2 border-t pt-1 text-sm sm:grid-cols-2">
                            {otherCols.map((col, colIdx) => {
                                const colLabel = typeof col.header === 'string' ? col.header : (col.id ?? `Campo ${String(colIdx + 2)}`);
                                return (
                                    <div key={colIdx} className="flex flex-col gap-0.5">
                                        <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{colLabel}</span>
                                        <div className="text-foreground text-sm font-normal break-words">{renderCellContent(col, item, index)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {actions && <div className="border-border/50 mt-1 flex items-center justify-end gap-2 border-t pt-3">{actions(item, index)}</div>}
                </CardContent>
            </Card>
        );
    };

    // --- Conteúdo da Tabela ---
    const tableContent = (
        <div className="border-border bg-card w-full overflow-x-auto rounded-md border">
            <Table className="min-w-full">
                <TableHeader>
                    <TableRow>
                        {selectable && (
                            <TableHead className="w-[44px] px-3 text-center">
                                <Checkbox
                                    checked={isAllPageSelected ? true : isSomePageSelected ? 'indeterminate' : false}
                                    onCheckedChange={handleToggleSelectAll}
                                    aria-label="Selecionar todos os itens da página"
                                />
                            </TableHead>
                        )}
                        {activeColumns.map((col, idx) => {
                            const colKey = col.sortKey ?? col.id ?? (col.accessorKey ? String(col.accessorKey) : undefined);
                            const isSorted = colKey && sortColumn === colKey;

                            return (
                                <TableHead
                                    key={idx}
                                    style={col.width ? { width: col.width } : undefined}
                                    className={cn(getAlignmentClass(col.align), 'whitespace-nowrap', col.className)}
                                >
                                    {col.enableSorting && colKey && onSort ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const nextDir = isSorted && sortDirection === 'asc' ? 'desc' : 'asc';
                                                onSort(colKey, nextDir);
                                            }}
                                            className="text-foreground hover:text-primary -ml-3 h-8 gap-1 text-xs font-semibold"
                                        >
                                            <span>{col.header}</span>
                                            {isSorted ? (
                                                sortDirection === 'asc' ? (
                                                    <ArrowUp className="text-primary h-3.5 w-3.5" />
                                                ) : (
                                                    <ArrowDown className="text-primary h-3.5 w-3.5" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="text-muted-foreground h-3 w-3" />
                                            )}
                                        </Button>
                                    ) : (
                                        col.header
                                    )}
                                </TableHead>
                            );
                        })}
                        {actions && (
                            <TableHead
                                style={actionsWidth ? { width: actionsWidth } : undefined}
                                className={cn(getAlignmentClass(actionsAlign), 'w-[120px] whitespace-nowrap')}
                            >
                                {actionsHeader}
                            </TableHead>
                        )}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={totalColumns} className="py-10 text-center">
                                {emptyContent}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item, index) => {
                            const isSelected = isItemSelected(item, index);
                            return (
                                <TableRow
                                    key={getRowKey(item, index)}
                                    data-state={isSelected ? 'selected' : undefined}
                                    className={cn(isSelected && 'bg-primary/5')}
                                >
                                    {selectable && (
                                        <TableCell className="w-[44px] px-3 text-center">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => {
                                                    handleToggleItem(item, index);
                                                }}
                                                aria-label={`Selecionar linha ${String(index + 1)}`}
                                            />
                                        </TableCell>
                                    )}
                                    {activeColumns.map((col, colIdx) => (
                                        <TableCell key={colIdx} className={cn(getAlignmentClass(col.align), col.className)}>
                                            {renderCellContent(col, item, index)}
                                        </TableCell>
                                    ))}
                                    {actions && <TableCell className={cn(getAlignmentClass(actionsAlign))}>{actions(item, index)}</TableCell>}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );

    // --- Conteúdo do Grid / Cards ---
    const gridContent = (
        <div>
            {data.length === 0 ? (
                emptyContent
            ) : (
                <div className={cn(gridClassName)}>
                    {data.map((item, index) => {
                        const isSelected = isItemSelected(item, index);
                        const toggle = () => {
                            handleToggleItem(item, index);
                        };

                        if (renderCard) {
                            return (
                                <div key={getRowKey(item, index)} className="w-full min-w-0">
                                    {renderCard(item, index, isSelected, toggle)}
                                </div>
                            );
                        }

                        return renderDefaultCard(item, index);
                    })}
                </div>
            )}
        </div>
    );

    // --- Renderização Dinâmica com Respeito a ViewMode e AutoCardViewOnMobile ---
    const shouldUseCardView = viewMode === 'grid' || (autoCardViewOnMobile && isMobile);
    const responsiveBody = shouldUseCardView ? gridContent : tableContent;

    const mainContent = (
        <div className={cn('w-full space-y-4', className)} id={tableId}>
            {toolbarContent}
            {responsiveBody}
            {pagination?.links && pagination.links.length > 1 && <PaginacaoListas links={pagination.links} />}

            {selectable && bulkActions && (
                <DataTableBulkActions
                    selectedCount={selectedItems.length}
                    actions={bulkActions}
                    selectedItems={selectedItems}
                    onClearSelection={handleClearSelection}
                />
            )}
        </div>
    );

    if (!cardWrapper) {
        return mainContent;
    }

    return (
        <Card className="border-border bg-card w-full overflow-hidden">
            {(cardTitle ?? cardDescription ?? cardHeaderAction) && (
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        {cardTitle && <CardTitle>{cardTitle}</CardTitle>}
                        {cardDescription && <CardDescription>{cardDescription}</CardDescription>}
                    </div>
                    {cardHeaderAction && <div className="shrink-0 self-start sm:self-auto">{cardHeaderAction}</div>}
                </CardHeader>
            )}
            <CardContent className="p-4 sm:p-6">{mainContent}</CardContent>
        </Card>
    );
}

export default DataTable;
