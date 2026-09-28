import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendIndicatorBadge } from '@/presentation/atoms/TrendIndicatorBadge';
import { TabelaDetalhamento } from '@/presentation/organisms/TabelaDetalhamento';
import { DadosRelatorio } from '@/types';
import { CalendarCheck, CircleCheck, CircleX, Clock } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';

interface Props {
    dados: DadosRelatorio;
}

const CORES = ['var(--chart-2)', 'var(--chart-4)', 'var(--chart-3)'];

function numero(valor: unknown): number {
    return Number(valor ?? 0);
}

function GraficoReservasPeriodo({ dados }: Props) {
    if (dados.linhas.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{dados.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Nenhuma reserva para os filtros selecionados.</p>
                </CardContent>
            </Card>
        );
    }

    const totalReservas = numero(dados.sumario['Total de Reservas']);
    const deferidas = numero(dados.sumario.Deferidas);
    const indeferidas = numero(dados.sumario.Indeferidas);
    const emAnalise = numero(dados.sumario['Em Análise']);

    const pctDeferidas = totalReservas > 0 ? (deferidas / totalReservas) * 100 : 0;
    const pctIndeferidas = totalReservas > 0 ? (indeferidas / totalReservas) * 100 : 0;

    const distribuicao = [
        { situacao: 'Deferidas', total: deferidas },
        { situacao: 'Indeferidas', total: indeferidas },
        { situacao: 'Em Análise', total: emAnalise },
    ];

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Total de Reservas</CardTitle>
                        <CalendarCheck className="text-primary h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-foreground text-2xl font-bold">{totalReservas}</div>
                        <p className="text-muted-foreground mt-1 text-xs">No período selecionado</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Deferidas</CardTitle>
                        <CircleCheck className="text-success-accent h-4 w-4" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                            <div className="text-foreground text-2xl font-bold">{deferidas}</div>
                            {totalReservas > 0 && <TrendIndicatorBadge value={pctDeferidas} isPositiveGood={true} showSign={false} />}
                        </div>
                        <p className="text-muted-foreground text-xs">Aprovadas institucionalmente</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Indeferidas</CardTitle>
                        <CircleX className="text-destructive-accent h-4 w-4" />
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                            <div className="text-foreground text-2xl font-bold">{indeferidas}</div>
                            {totalReservas > 0 && <TrendIndicatorBadge value={pctIndeferidas} isPositiveGood={false} showSign={false} />}
                        </div>
                        <p className="text-muted-foreground text-xs">Recusadas ou com conflito</p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Em Análise</CardTitle>
                        <Clock className="text-warning-accent h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-foreground text-2xl font-bold">{emAnalise}</div>
                        <p className="text-muted-foreground mt-1 text-xs">Pendentes de deliberação</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold tracking-tight">Distribuição por Situação</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const chartConfig = distribuicao.reduce<ChartConfig>((acc, d, i) => {
                                acc[d.situacao] = { label: d.situacao, color: CORES[i % CORES.length] };
                                return acc;
                            }, {});
                            return (
                                <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
                                    <PieChart accessibilityLayer>
                                        <ChartTooltip content={<ChartTooltipContent nameKey="situacao" />} />
                                        <Pie data={distribuicao} dataKey="total" nameKey="situacao" innerRadius={60}>
                                            {distribuicao.map((item, index) => (
                                                <Cell key={item.situacao} fill={CORES[index % CORES.length]} />
                                            ))}
                                        </Pie>
                                        <ChartLegend content={<ChartLegendContent nameKey="situacao" />} />
                                    </PieChart>
                                </ChartContainer>
                            );
                        })()}
                    </CardContent>
                </Card>

                <Card className="shadow-xs">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold tracking-tight">Resumo Quantitativo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Situação</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Proporção</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distribuicao.map((item) => {
                                    const pct = totalReservas > 0 ? (item.total / totalReservas) * 100 : 0;
                                    return (
                                        <TableRow key={item.situacao}>
                                            <TableCell className="font-medium">{item.situacao}</TableCell>
                                            <TableCell className="text-right">{item.total}</TableCell>
                                            <TableCell className="text-muted-foreground text-right text-xs">{pct.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            <TabelaDetalhamento colunas={dados.colunas} linhas={dados.linhas} />
        </div>
    );
}

export default GraficoReservasPeriodo;
