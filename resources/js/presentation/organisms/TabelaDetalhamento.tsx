import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PaginacaoRelatorio } from '@/presentation/organisms/PaginacaoRelatorio';
import { ColunaRelatorio } from '@/types';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const OPCOES_POR_PAGINA = [10, 25, 50, 100];

type Direcao = 'asc' | 'desc';

interface Ordenacao {
    chave: string;
    direcao: Direcao;
}

interface Props {
    titulo?: string;
    colunas: ColunaRelatorio[];
    linhas: Record<string, unknown>[];
    itemsPerPage?: number;
}

const DATA_BR = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/;

function valorOrdenavel(valor: unknown): number | string {
    if (valor === null || valor === undefined) {
        return '';
    }

    if (typeof valor === 'number') {
        return valor;
    }

    if (typeof valor === 'boolean') {
        return valor ? 1 : 0;
    }

    const texto = String(valor).trim();

    const data = DATA_BR.exec(texto);
    if (data) {
        const [, dia, mes, ano, hora = '00', minuto = '00'] = data;
        return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto)).getTime();
    }

    const numerico = texto.replace('%', '').replace(',', '.').trim();
    if (numerico !== '' && !Number.isNaN(Number(numerico))) {
        return Number(numerico);
    }

    return texto.toLocaleLowerCase('pt-BR');
}

export function TabelaDetalhamento({ titulo = 'Detalhamento', colunas, linhas, itemsPerPage = 10 }: Props) {
    const [pagina, setPagina] = useState(1);
    const [porPagina, setPorPagina] = useState(itemsPerPage);
    const [ordenacao, setOrdenacao] = useState<Ordenacao | undefined>();

    useEffect(() => {
        setPagina(1);
    }, [linhas, porPagina, ordenacao]);

    const linhasOrdenadas = useMemo(() => {
        if (!ordenacao) {
            return linhas;
        }

        const fator = ordenacao.direcao === 'asc' ? 1 : -1;

        return [...linhas].sort((a, b) => {
            const valorA = valorOrdenavel(a[ordenacao.chave]);
            const valorB = valorOrdenavel(b[ordenacao.chave]);

            if (typeof valorA === 'number' && typeof valorB === 'number') {
                return (valorA - valorB) * fator;
            }

            return String(valorA).localeCompare(String(valorB), 'pt-BR') * fator;
        });
    }, [linhas, ordenacao]);

    const inicio = (pagina - 1) * porPagina;
    const linhasPagina = linhasOrdenadas.slice(inicio, inicio + porPagina);

    const alternarOrdenacao = (chave: string) => {
        setOrdenacao((atual) => {
            if (atual?.chave !== chave) {
                return { chave, direcao: 'asc' };
            }

            return atual.direcao === 'asc' ? { chave, direcao: 'desc' } : undefined;
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                <CardTitle className="text-base">{titulo}</CardTitle>
                <div className="flex items-center gap-2">
                    <Label htmlFor="registros-por-pagina" className="text-muted-foreground text-sm">
                        Por página
                    </Label>
                    <Select
                        value={String(porPagina)}
                        onValueChange={(valor) => {
                            setPorPagina(Number(valor));
                        }}
                    >
                        <SelectTrigger id="registros-por-pagina" className="h-8 w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {OPCOES_POR_PAGINA.map((opcao) => (
                                <SelectItem key={opcao} value={String(opcao)}>
                                    {opcao}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {colunas.map((coluna) => {
                                    const ativa = ordenacao?.chave === coluna.chave;
                                    const Icone = !ativa ? ChevronsUpDown : ordenacao.direcao === 'asc' ? ArrowUp : ArrowDown;

                                    return (
                                        <TableHead key={coluna.chave} className="p-0">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    alternarOrdenacao(coluna.chave);
                                                }}
                                                aria-label={`Ordenar por ${coluna.rotulo}`}
                                                className="hover:text-foreground flex w-full items-center gap-1 px-4 py-3 text-left font-medium"
                                            >
                                                {coluna.rotulo}
                                                <Icone className={cn('h-3.5 w-3.5 shrink-0', ativa ? 'opacity-100' : 'opacity-40')} />
                                            </button>
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {linhasPagina.map((linha, index) => (
                                <TableRow key={inicio + index}>
                                    {colunas.map((coluna) => (
                                        <TableCell key={coluna.chave}>{String(linha[coluna.chave] ?? '')}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <PaginacaoRelatorio totalItems={linhasOrdenadas.length} itemsPerPage={porPagina} currentPage={pagina} onPageChange={setPagina} />
            </CardContent>
        </Card>
    );
}
