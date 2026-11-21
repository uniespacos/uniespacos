import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/i18n';
import { EmptyState } from '@/presentation/molecules/EmptyState';
import TabsItemReserva from '@/presentation/molecules/TabsItemReserva';
import TabsItemEspacosFavoritos from '@/presentation/organisms/TabsItemEspacosFavoritos';
import AppLayout from '@/presentation/templates/AppLayout';
import { Espaco, Reserva, User, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarPlus, ListChecks, Sparkles, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

interface EspacoRecente {
    id: number;
    nome: string;
    andar?: { modulo?: { nome: string } };
}

interface DashboardUsuarioProps {
    user?: User;
    espacosFavoritos?: Espaco[];
    reservas?: Reserva[];
    espacosRecentes?: EspacoRecente[];
}

export default function DashboardUsuarioPage(props: DashboardUsuarioProps) {
    const { t } = useTranslation();
    const breadcrumbs = useMemo<BreadcrumbItem[]>(() => [{ title: t('dashboard.title'), href: '/dashboard' }], [t]);
    const pageProps = usePage<{
        user: User;
        espacosFavoritos?: Espaco[];
        reservas?: Reserva[];
        espacosRecentes?: EspacoRecente[];
    }>().props;

    const user = props.user ?? pageProps.user;
    const rawFavoritos = props.espacosFavoritos ?? pageProps.espacosFavoritos;
    const espacosFavoritos = useMemo(() => rawFavoritos ?? [], [rawFavoritos]);

    const reservas = props.reservas ?? pageProps.reservas ?? [];
    const espacosRecentes = props.espacosRecentes ?? pageProps.espacosRecentes ?? [];

    const [searchTermFavoritos, setSearchTermFavoritos] = useState('');

    const filteredEspacosFavoritos = useMemo(() => {
        if (!searchTermFavoritos) return espacosFavoritos;
        const termo = searchTermFavoritos.toLowerCase();
        return espacosFavoritos.filter((e) => e.nome.toLowerCase().includes(termo) || e.andar?.modulo?.unidade?.nome.toLowerCase().includes(termo));
    }, [espacosFavoritos, searchTermFavoritos]);

    const atalhosSecundarios = [
        {
            label: t('dashboard.actions.meus_favoritos'),
            descricao: t('dashboard.actions.meus_favoritos_desc'),
            Icone: Star,
            href: route('espacos.favoritos'),
        },
        {
            label: t('nav.minhas_reservas'),
            descricao: t('dashboard.actions.minhas_reservas_desc'),
            Icone: ListChecks,
            href: route('reservas.index'),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="border-border/80 from-card via-card/80 to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 shadow-xs sm:p-8">
                    <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2">
                                <Badge variant="secondary" className="bg-background/80 text-xs font-medium backdrop-blur-xs">
                                    <Sparkles className="text-primary mr-1 h-3 w-3" />
                                    UniEspaços
                                </Badge>
                            </div>
                            <h1 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
                                {t('dashboard.welcome', { name: user.name })}
                            </h1>
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
                                {t('dashboard.actions.consultar_espacos')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {espacosRecentes.length > 0 && (
                    <section aria-labelledby="dashboard-reservar-de-novo" className="space-y-3">
                        <div>
                            <h2 id="dashboard-reservar-de-novo" className="text-foreground text-base font-semibold">
                                {t('dashboard.actions.reservar_de_novo')}
                            </h2>
                            <p className="text-muted-foreground text-sm">{t('dashboard.actions.reservar_de_novo_desc')}</p>
                        </div>
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {espacosRecentes.map((espaco) => (
                                <li key={espaco.id} className="min-w-0">
                                    <Link
                                        href={route('espacos.show', espaco.id)}
                                        className="border-border/70 bg-card hover:border-primary/50 group flex items-center justify-between gap-3 rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-foreground truncate text-sm font-semibold">{espaco.nome}</p>
                                            {espaco.andar?.modulo?.nome && (
                                                <p className="text-muted-foreground truncate text-xs">{espaco.andar.modulo.nome}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {atalhosSecundarios.map(({ label, descricao, Icone, href }) => (
                        <Link key={href} href={href} className="group block min-w-0">
                            <Card className="border-border/70 group-hover:border-primary/50 h-full min-w-0 transition-all duration-200 group-hover:shadow-sm">
                                <CardContent className="flex items-center justify-between gap-3 overflow-hidden p-3 sm:p-5">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground shrink-0 rounded-xl p-2.5 transition-colors sm:p-3">
                                            <Icone className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-foreground truncate text-sm font-semibold sm:text-base">{label}</p>
                                            <p className="text-muted-foreground hidden truncate text-xs sm:block">{descricao}</p>
                                        </div>
                                    </div>
                                    <ArrowRight className="text-muted-foreground group-hover:text-primary hidden h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 sm:block" />
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>

                <Tabs defaultValue="reservas" className="w-full space-y-4">
                    <TabsList className="grid w-full grid-cols-2 sm:w-[440px]">
                        <TabsTrigger value="reservas">
                            <ListChecks className="mr-2 h-4 w-4" />
                            {t('dashboard.tabs.solicitacoes')} ({String(reservas.length)})
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
                            <EmptyState
                                icon={ListChecks}
                                title={t('dashboard.empty.no_reservas')}
                                action={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            router.get(route('espacos.index'));
                                        }}
                                    >
                                        {t('dashboard.actions.consultar_espacos')}
                                    </Button>
                                }
                            />
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
                            <EmptyState
                                icon={Star}
                                title={t('dashboard.empty.no_favoritos')}
                                action={
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            router.get(route('espacos.index'));
                                        }}
                                    >
                                        {t('dashboard.actions.consultar_espacos')}
                                    </Button>
                                }
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
