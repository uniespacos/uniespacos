import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TipoRelatorio, type FormatoRelatorioType, type TipoRelatorioType } from '@/contracts';
import { useDadosRelatorio } from '@/hooks/use-dados-relatorio';
import { useGerarRelatorio } from '@/hooks/use-gerar-relatorio';
import { useTranslation } from '@/i18n';
import { EmptyState } from '@/presentation/molecules/EmptyState';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { ExportarRelatorio } from '@/presentation/organisms/ExportarRelatorio';
import { FiltrosInventarioEspacos } from '@/presentation/organisms/FiltrosInventarioEspacos';
import { FiltrosOcupacaoEspacos } from '@/presentation/organisms/FiltrosOcupacaoEspacos';
import { FiltrosReservasPeriodo } from '@/presentation/organisms/FiltrosReservasPeriodo';
import AppLayout from '@/presentation/templates/AppLayout';
import { FiltrosRelatorio, OpcoesInventario, TipoRelatorioOption } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertCircle, BarChart3, Filter, SlidersHorizontal } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';

const GraficoReservasPeriodo = lazy(() => import('@/presentation/organisms/GraficoReservasPeriodo'));
const GraficoOcupacaoEspacos = lazy(() => import('@/presentation/organisms/GraficoOcupacaoEspacos'));
const GraficoInventarioEspacos = lazy(() => import('@/presentation/organisms/GraficoInventarioEspacos'));

interface Props {
    tipos_disponiveis: TipoRelatorioOption[];
    opcoes_inventario: OpcoesInventario;
}

export default function RelatoriosGestorPage({ tipos_disponiveis, opcoes_inventario }: Props) {
    const { t } = useTranslation();
    const [tipoSelecionado, setTipoSelecionado] = useState<TipoRelatorioType | undefined>();
    const [filtros, setFiltros] = useState<Partial<FiltrosRelatorio>>({});

    const { gerar, estaGerando } = useGerarRelatorio('/gestor/relatorios/gerar');
    const { dados, status, erro } = useDadosRelatorio('/gestor/relatorios/dados', tipoSelecionado, filtros);

    const handleExport = (formato: FormatoRelatorioType) => {
        if (!tipoSelecionado) return;
        void gerar({ tipo: tipoSelecionado, formato, filtros });
    };

    return (
        <AppLayout breadcrumbs={[{ title: t('nav.relatorios'), href: '/gestor/relatorios' }]}>
            <Head title={t('relatorios.gestor_titulo')} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <GenericHeader
                    titulo={t('relatorios.gestor_titulo')}
                    descricao={t('relatorios.gestor_subtitulo')}
                    actions={<ExportarRelatorio onExport={handleExport} estaGerando={estaGerando} disabled={!tipoSelecionado} />}
                />

                {/* Seleção de Tipo de Relatório */}
                <div className="space-y-2">
                    <Tabs
                        value={tipoSelecionado}
                        onValueChange={(value) => {
                            setTipoSelecionado(value as TipoRelatorioType);
                        }}
                        className="w-full"
                    >
                        <TabsList className="bg-muted/60 border-border/40 flex h-auto w-full flex-wrap justify-start gap-1.5 rounded-xl border p-1.5">
                            {tipos_disponiveis.map((tipo) => (
                                <TabsTrigger
                                    key={tipo.value}
                                    value={tipo.value}
                                    className="data-[state=active]:bg-card data-[state=active]:text-primary rounded-lg px-3 py-2 text-xs font-medium transition-all data-[state=active]:shadow-xs"
                                >
                                    {tipo.label}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                {/* Estado Inicial Vazio */}
                {!tipoSelecionado && (
                    <EmptyState
                        icon={BarChart3}
                        title={t('relatorios.empty_institucional_title')}
                        description={t('relatorios.empty_institucional_desc')}
                    />
                )}

                {/* Área de Filtros e Resultados */}
                {tipoSelecionado && (
                    <div className="space-y-6">
                        <Card className="border-border/80 shadow-xs">
                            <CardHeader className="border-border/40 border-b pb-3">
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="text-primary h-4 w-4" />
                                    <CardTitle className="text-sm font-semibold tracking-tight">{t('relatorios.filtros_card_title')}</CardTitle>
                                </div>
                                <CardDescription className="text-xs">{t('relatorios.filtros_card_desc')}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {tipoSelecionado === TipoRelatorio.RESERVAS_PERIODO && (
                                    <FiltrosReservasPeriodo filtros={filtros} onChange={setFiltros} />
                                )}
                                {tipoSelecionado === TipoRelatorio.OCUPACAO_ESPACOS && (
                                    <FiltrosOcupacaoEspacos filtros={filtros} onChange={setFiltros} />
                                )}
                                {tipoSelecionado === TipoRelatorio.INVENTARIO_ESPACOS && (
                                    <FiltrosInventarioEspacos filtros={filtros} opcoes={opcoes_inventario} onChange={setFiltros} />
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            {status === 'loading' && (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <Skeleton key={index} className="h-28 w-full rounded-xl" />
                                        ))}
                                    </div>
                                    <Skeleton className="h-[340px] w-full rounded-xl" />
                                </div>
                            )}

                            {status === 'error' && (
                                <Alert variant="destructive" className="border-destructive-accent/30">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>{t('relatorios.feedback.erro')}</AlertTitle>
                                    <AlertDescription>{erro}</AlertDescription>
                                </Alert>
                            )}

                            {status === 'empty' && (
                                <EmptyState
                                    icon={Filter}
                                    title={t('relatorios.empty_results_title')}
                                    description={t('relatorios.empty_results_desc')}
                                />
                            )}

                            {status === 'success' && dados && (
                                <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-xl" />}>
                                    {tipoSelecionado === TipoRelatorio.RESERVAS_PERIODO && <GraficoReservasPeriodo dados={dados} />}
                                    {tipoSelecionado === TipoRelatorio.OCUPACAO_ESPACOS && <GraficoOcupacaoEspacos dados={dados} />}
                                    {tipoSelecionado === TipoRelatorio.INVENTARIO_ESPACOS && <GraficoInventarioEspacos dados={dados} />}
                                </Suspense>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
