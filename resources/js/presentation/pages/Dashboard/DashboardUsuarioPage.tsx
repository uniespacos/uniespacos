import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/i18n';
import TabsItemEspacosFavoritos from '@/presentation/molecules/TabsItemEspacosFavoritos';
import TabsItemReserva from '@/presentation/molecules/TabsItemReserva';
import AppLayout from '@/presentation/templates/AppLayout';
import { Espaco, Reserva, User, type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarPlus, ListChecks, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Painel Inicial',
        href: '/dashboard',
    },
];

interface DashboardUsuarioProps {
    user?: User;
    espacosFavoritos?: Espaco[];
    reservas?: Reserva[];
}

export default function DashboardUsuarioPage(props: DashboardUsuarioProps) {
    const { t } = useTranslation();
    const pageProps = usePage<{
        user: User;
        espacosFavoritos?: Espaco[];
        reservas?: Reserva[];
    }>().props;

    const user = props.user ?? pageProps.user;
    const rawFavoritos = props.espacosFavoritos ?? pageProps.espacosFavoritos;
    const espacosFavoritos = useMemo(() => rawFavoritos ?? [], [rawFavoritos]);

    const reservas = props.reservas ?? pageProps.reservas ?? [];

    const [searchTermFavoritos, setSearchTermFavoritos] = useState('');

    const filteredEspacosFavoritos = useMemo(() => {
        if (!searchTermFavoritos) return espacosFavoritos;
        const termo = searchTermFavoritos.toLowerCase();
        return espacosFavoritos.filter((e) => e.nome.toLowerCase().includes(termo) || e.andar?.modulo?.unidade?.nome.toLowerCase().includes(termo));
    }, [espacosFavoritos, searchTermFavoritos]);

    const atalhosSecundarios = [
        {
            label: t('dashboard.actions.consultar_espacos'),
            descricao: t('espacos.consultar_espacos_desc'),
            Icone: CalendarPlus,
            href: route('espacos.index'),
        },
        {
            label: t('nav.minhas_reservas'),
            descricao: t('reservas.subtitulo'),
            Icone: ListChecks,
            href: route('reservas.index'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Hero Banner Boas-vindas */}
                <div className="border-border/80 from-card via-card/80 to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xs sm:p-8">
                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2">
                                <Badge variant="secondary" className="bg-background/80 text-xs font-medium backdrop-blur-xs">
                                    <Sparkles className="text-primary mr-1 h-3 w-3" />
                                    UniEspaços
                                </Badge>
                            </div>
                            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">{t('dashboard.welcome', { name: user.name })}</h1>
                            <p className="text-muted-foreground max-w-xl text-sm sm:text-base">
                                {user.setor
                                    ? `${user.setor.nome} (${user.setor.sigla}) • ${t('dashboard.welcome_sub')}`
                                    : `${t('dashboard.welcome_sub')}! ${t('espacos.consultar_espacos_desc')}`}
                            </p>
                        </div>
                        <div className="flex flex-col gap-2.5 sm:flex-row">
                            <Button
                                size="lg"
                                onClick={() => {
                                    router.get(route('espacos.index'));
                                }}
                                className="shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <CalendarPlus className="mr-2 h-5 w-5" />
                                {t('dashboard.actions.solicitar_reserva')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Atalhos Rápidos */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {atalhosSecundarios.map(({ label, descricao, Icone, href }) => (
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
                            className="border-border/70 group min-w-0 hover:border-primary/50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                        >
                            <CardContent className="flex items-center justify-between gap-3 overflow-hidden p-5">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 rounded-xl p-3 transition-colors">
                                        <Icone className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-foreground truncate text-sm font-semibold sm:text-base">{label}</p>
                                        <p className="text-muted-foreground truncate text-xs">{descricao}</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Seção com Abas de Reservas Recentes e Favoritos */}
                {(reservas.length > 0 || espacosFavoritos.length > 0) && (
                    <Tabs defaultValue="reservas" className="w-full space-y-4">
                        <TabsList className="grid w-full grid-cols-2 sm:w-[400px]">
                            <TabsTrigger value="reservas">
                                <ListChecks className="mr-2 h-4 w-4" />
                                {t('dashboard.tabs.solicitacoes')}
                            </TabsTrigger>
                            <TabsTrigger value="favoritos">
                                <Star className="mr-2 h-4 w-4" />
                                {t('dashboard.tabs.favoritos')} ({String(espacosFavoritos.length)})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="reservas" className="mt-0">
                            {reservas.length > 0 ? (
                                <TabsItemReserva reservas={reservas} />
                            ) : (
                                <Card>
                                    <CardContent className="text-muted-foreground py-12 text-center text-sm">
                                        {t('dashboard.empty.no_reservas')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>

                        <TabsContent value="favoritos" className="mt-0">
                            {espacosFavoritos.length > 0 ? (
                                <TabsItemEspacosFavoritos
                                    user={user}
                                    espacosFiltrados={filteredEspacosFavoritos}
                                    searchTerm={searchTermFavoritos}
                                    setSearchTerm={setSearchTermFavoritos}
                                />
                            ) : (
                                <Card>
                                    <CardContent className="text-muted-foreground py-12 text-center text-sm">
                                        {t('dashboard.empty.no_favoritos')}
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </AppLayout>
    );
}
