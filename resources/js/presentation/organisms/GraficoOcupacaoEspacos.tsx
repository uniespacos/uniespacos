import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { TabelaDetalhamento } from '@/presentation/organisms/TabelaDetalhamento';
import { DadosRelatorio } from '@/types';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

interface Props {
    dados: DadosRelatorio;
}

const chartConfig = {
    taxa_ocupacao_num: {
        label: 'Taxa de Ocupação (%)',
        color: 'var(--chart-1)',
    },
} satisfies ChartConfig;

function GraficoOcupacaoEspacos({ dados }: Props) {
    if (dados.linhas.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{dados.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">Nenhum dado de ocupação para os filtros selecionados.</p>
                </CardContent>
            </Card>
        );
    }

    const dadosGrafico = dados.linhas
        .map((linha) => ({
            nome_espaco: String(linha.nome_espaco ?? ''),
            taxa_ocupacao_num: Number(linha.taxa_ocupacao_num ?? 0),
        }))
        .sort((a, b) => b.taxa_ocupacao_num - a.taxa_ocupacao_num)
        .slice(0, 15);

    const alturaGrafico = Math.max(200, dadosGrafico.length * 32 + 48);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Taxa de Ocupação — Top 15</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="aspect-auto w-full" style={{ height: alturaGrafico }}>
                        <BarChart accessibilityLayer data={dadosGrafico} layout="vertical">
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" dataKey="taxa_ocupacao_num" />
                            <YAxis type="category" dataKey="nome_espaco" width={160} tickLine={false} axisLine={false} />
                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(2)}%`} />} />
                            <Bar dataKey="taxa_ocupacao_num" fill="var(--color-taxa_ocupacao_num)" radius={4} maxBarSize={24} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            <TabelaDetalhamento colunas={dados.colunas} linhas={dados.linhas} />
        </div>
    );
}

export default GraficoOcupacaoEspacos;
