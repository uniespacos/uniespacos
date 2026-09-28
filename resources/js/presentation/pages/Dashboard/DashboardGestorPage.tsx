import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PERMISSION_SECAO_RELATORIOS } from '@/constants/permissions';
import { useDadosRelatorio } from '@/hooks/use-dados-relatorio';
import { useTranslation } from '@/i18n';
import { hasPermission } from '@/lib/auth';
import AppLayout from '@/presentation/templates/AppLayout';
import { Agenda, Espaco, User, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { format, subDays } from 'date-fns';
import { ArrowRight, BarChart3, CalendarSearch, Eye, ShieldCheck, Star } from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';

const GraficoReservasPeriodo = lazy(() => import('@/presentation/organisms/GraficoReservasPeriodo'));

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Painel Inicial',
        href: '/dashboard',
    },
];

interface DashboardGestorProps {
    user?: User;
    espacos?: Espaco[];
    statusDasReservas?: {
        pendentes: number;
    };
    agendas?: Agenda[];
    espacosFavoritos?: Espaco[];
}

export default function DashboardGestorPage(props: DashboardGestorProps) {
    const { t } = useTranslation();
    const pageProps = usePage<{
        auth: { user: User };
        user?: User;
        espacos?: Espaco[];
        statusDasReservas?: {
            pendentes: number;
        };
        agendas?: Agenda[];
        espacosFavoritos?: Espaco[];
    }>().props;

    const user = props.user ?? pageProps.user ?? pageProps.auth.user;
    const authUser = pageProps.auth.user;
    const statusDasReservas = props.statusDasReservas ??
        pageProps.statusDasReservas ?? {
            pendentes: 0,
        };

    const podeVerRelatorios = hasPermission(authUser, PERMISSION_SECAO_RELATORIOS);

    const filtrosPeriodo = useMemo(
        () => ({
            data_inicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            data_fim: format(new Date(), 'yyyy-MM-dd'),
        }),
        [],
    );

    const { dados, status } = useDadosRelatorio(route('gestor.relatorios.dados'), podeVerRelatorios ? 'reservas_periodo' : undefined, filtrosPeriodo);

    const atalhos: {
        label: string;
        descricao: string;
        Icone: typeof Eye;
        href: string;
        badge?: string;
        highlight?: boolean;
    }[] = [
        {
            label: t('nav.gerir_reservas'),
            descricao: t('reservas.gestor_subtitulo'),
            Icone: Eye,
            href: route('gestor.reservas.index'),
            badge: statusDasReservas.pendentes > 0 ? `${String(statusDasReservas.pendentes)} ${t('dashboard.stats.pendentes').toLowerCase()}` : undefined,
            highlight: statusDasReservas.pendentes > 0,
        },
        {
            label: t('nav.consultar_espacos'),
            descricao: t('espacos.consultar_espacos_desc'),
            Icone: CalendarSearch,
            href: route('espacos.index'),
        },
        {
            label: t('espacos.favoritos_titulo'),
            descricao: t('espacos.favoritos_desc'),
            Icone: Star,
            href: route('espacos.favoritos'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard.gestor_title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Hero Banner do Gestor */}
                <div className="border-border/80 from-card via-card/80 to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xs sm:p-8">
                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2">
                                <Badge variant="secondary" className="bg-background/80 text-xs font-medium backdrop-blur-xs">
                                    <ShieldCheck className="text-primary mr-1 h-3 w-3" />
                                    {t('usuarios.roles.gestor')}
                                </Badge>
                                {statusDasReservas.pendentes > 0 && (
                                    <Badge variant="outline" className="border-warning-accent/30 bg-warning/10 text-warning-accent text-xs font-medium">
                                        {statusDasReservas.pendentes} {t('dashboard.stats.pendentes').toLowerCase()}
                                    </Badge>
                                )}
                            </div>
                            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.welcome', { name: user.name })}</h1>
                            <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
                                {t('reservas.gestor_subtitulo')}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                            <Button
                                size="lg"
                                onClick={() => {
                                    router.get(route('gestor.reservas.index'));
                                }}
                                className="shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Eye className="mr-2 h-5 w-5" />
                                {t('nav.gerir_reservas')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Atalhos Operacionais do Gestor */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {atalhos.map(({ label, descricao, Icone, href, badge, highlight }) => (
                        <Card
                            key={label}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                                router.get(href);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    router.get(href);
                                }
                            }}
                            className={`border-border/70 group cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                highlight ? 'hover:border-primary/60 border-primary/30 bg-primary/5' : 'hover:border-primary/50'
                            }`}
                        >
                            <CardContent className="flex items-center justify-between gap-3 overflow-hidden p-5">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 rounded-xl p-3 transition-colors">
                                        <Icone className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-foreground truncate text-sm font-semibold sm:text-base">{label}</p>
                                            {badge && (
                                                <Badge variant="secondary" className="shrink-0 bg-primary/15 text-primary text-xs font-semibold">
                                                    {badge}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground truncate text-xs">{descricao}</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </CardContent>
                        </Card>
                    ))}
                </div>


                {/* Visão Geral com Gráfico Carregado Sob Demanda */}
                {podeVerRelatorios && (
                    <Card className="border-border/70">
                        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 p-5">
                            <div>
                                <CardTitle className="text-base font-semibold">{t('relatorios.gestor_titulo')}</CardTitle>
                                <CardDescription className="text-xs">{t('relatorios.gestor_subtitulo')}</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    router.get(route('gestor.relatorios.index'));
                                }}
                            >
                                <BarChart3 className="mr-2 h-4 w-4" />
                                {t('relatorios.filtros.exportar')}
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pt-0 pb-5">
                            {status === 'loading' && <Skeleton className="h-[260px] w-full rounded-xl" />}
                            {status === 'error' && (
                                <Alert variant="destructive">
                                    <AlertDescription>{t('relatorios.feedback.erro')}</AlertDescription>
                                </Alert>
                            )}
                            {status === 'empty' && (
                                <p className="text-muted-foreground py-10 text-center text-sm">{t('relatorios.empty_results_desc')}</p>
                            )}
                            {status === 'success' && dados && (
                                <Suspense fallback={<Skeleton className="h-[260px] w-full rounded-xl" />}>
                                    <GraficoReservasPeriodo dados={dados} />
                                </Suspense>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
