import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { FormatoRelatorio } from '@/types';
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2, Table } from 'lucide-react';
import React from 'react';

export interface ExportarRelatorioProps {
    onExport: (formato: FormatoRelatorio) => void;
    estaGerando: boolean;
    disabled?: boolean;
    className?: string;
    align?: 'start' | 'center' | 'end';
}

const FORMATOS: { value: FormatoRelatorio; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
    {
        value: 'pdf',
        label: 'Síntese Executiva (PDF)',
        description: 'Visão analítica e KPIs para reuniões (máx. 3 págs)',
        icon: FileText,
    },
    {
        value: 'xlsx',
        label: 'Planilha Completa (XLSX)',
        description: 'Base integral com dados tabulados até 10.000 linhas',
        icon: Table,
    },
    {
        value: 'csv',
        label: 'Arquivo Bruto (CSV)',
        description: 'Dados brutos separados por vírgula até 10.000 linhas',
        icon: FileSpreadsheet,
    },
];

export function ExportarRelatorio({ onExport, estaGerando, disabled, className, align = 'end' }: ExportarRelatorioProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled || estaGerando}
                    className={cn('gap-2 shadow-xs transition-all', className)}
                    data-testid="exportar-relatorio-trigger"
                >
                    {estaGerando ? <Loader2 className="text-primary h-4 w-4 animate-spin" /> : <Download className="text-primary h-4 w-4" />}
                    <span>{estaGerando ? 'Gerando Relatório...' : 'Exportar Relatório'}</span>
                    <ChevronDown className="text-muted-foreground h-3.5 w-3.5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-72 p-1.5">
                <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wider uppercase">
                    Formato de Exportação
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FORMATOS.map((formato) => {
                    const IconComponent = formato.icon;
                    return (
                        <DropdownMenuItem
                            key={formato.value}
                            onSelect={() => {
                                onExport(formato.value);
                            }}
                            className="focus:bg-accent flex cursor-pointer items-start gap-2.5 rounded-md p-2"
                            data-testid={`export-option-${formato.value}`}
                        >
                            <div className="bg-muted text-foreground mt-0.5 rounded p-1.5">
                                <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-foreground text-xs font-medium">{formato.label}</span>
                                <span className="text-muted-foreground text-[10.5px] leading-tight">{formato.description}</span>
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ExportarRelatorio;
