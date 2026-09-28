import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TabelaDetalhamento } from '@/presentation/organisms/TabelaDetalhamento';
import { DadosRelatorio } from '@/types';
import { Building, Gauge, Layers, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface Props {
    dados: DadosRelatorio;
}

const chartConfig = {
    capacidade_pessoas: {
        label: 'Capacidade',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

function GraficoInventarioEspacos({ dados }: Props) {
    if (dados.linhas.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{dados.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Nenhum espaço para os filtros selecionados.</p>
                </CardContent>
            </Card>
        );
    }

    const topCapacidade = dados.linhas
        .map((linha) => ({
            nome: String(linha.nome ?? ''),
            capacidade_pessoas: Number(linha.capacidade_pessoas ?? 0),
        }))
        .sort((a, b) => b.capacidade_pessoas - a.capacidade_pessoas)
        .slice(0, 15);

    const alturaGrafico = Math.max(200, topCapacidade.length * 32 + 48);

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Espaços</CardTitle>
                        <Building className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{String(dados.sumario['Total de Espaços'] ?? '')}</div>
                        <p className="text-muted-foreground text-xs">Cadastrados</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
                        <Layers className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{String(dados.sumario['Capacidade Total'] ?? '')}</div>
                        <p className="text-muted-foreground text-xs">Pessoas</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Média de Capacidade</CardTitle>
                        <Gauge className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{String(dados.sumario['Média de Capacidade'] ?? '')}</div>
                        <p className="text-muted-foreground text-xs">Por espaço</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gestores Únicos</CardTitle>
                        <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{String(dados.sumario['Total de Gestores Únicos'] ?? '')}</div>
                        <p className="text-muted-foreground text-xs">Delegados</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Top 15 Espaços por Capacidade</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: alturaGrafico }}>
                        <BarChart accessibilityLayer data={topCapacidade} layout="vertical">
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" dataKey="capacidade_pessoas" />
                            <YAxis type="category" dataKey="nome" width={140} tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="capacidade_pessoas" fill="var(--color-capacidade_pessoas)" radius={4} maxBarSize={24} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <TabelaDetalhamento colunas={dados.colunas} linhas={dados.linhas} />
        </div>
    );
}

export default GraficoInventarioEspacos;
