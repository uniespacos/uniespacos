import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from '@/i18n';
import { capacidadeValida } from '@/lib/utils/disponibilidade-filtro';
import { EmptyState } from '@/presentation/molecules/EmptyState';
import { QUALQUER_TURNO_INTENCAO, ReservaIntencaoFields, type TurnoIntencao } from '@/presentation/molecules/ReservaIntencaoFields';
import TabsItemReserva from '@/presentation/molecules/TabsItemReserva';
import TabsItemEspacosFavoritos from '@/presentation/organisms/TabsItemEspacosFavoritos';
import AppLayout from '@/presentation/templates/AppLayout';
import { Espaco, Reserva, User, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
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
    const [dataIntencao, setDataIntencao] = useState('');
    const [turnoIntencao, setTurnoIntencao] = useState<TurnoIntencao>(QUALQUER_TURNO_INTENCAO);
    const [capacidadeIntencao, setCapacidadeIntencao] = useState('');

    const filteredEspacosFavoritos = useMemo(() => {
        if (!searchTermFavoritos) return espacosFavoritos;
        const termo = searchTermFavoritos.toLowerCase();
        return espacosFavoritos.filter((e) => e.nome.toLowerCase().includes(termo) || e.andar?.modulo?.unidade?.nome.toLowerCase().includes(termo));
    }, [espacosFavoritos, searchTermFavoritos]);

    const handleDataIntencaoChange = (novaData: Date | undefined) => {
        const formatada = novaData ? format(novaData, 'yyyy-MM-dd') : '';
        setDataIntencao(formatada);
        if (!formatada) {
            setTurnoIntencao(QUALQUER_TURNO_INTENCAO);
        }
    };

    const handleBuscarEspacos = () => {
        const query: Record<string, string> = {};
        if (dataIntencao) {
            query.data = dataIntencao;
            if (turnoIntencao !== QUALQUER_TURNO_INTENCAO) {
                query.turno = turnoIntencao;
            }
        }
        const capValida = capacidadeValida(capacidadeIntencao);
        if (capValida) {
            query.capacidade = capValida;
        }
        router.get(route('espacos.index'), query);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('dashboard.title')} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="border-border/80 from-card via-card/80 to-primary/5 relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-xs sm:p-7">
                    <div className="relative z-10 flex flex-col gap-5">
                        <div className="space-y-1.5">
                            <div className="inline-flex items-center gap-2">
                                <Badge variant="secondary" className="bg-background/80 text-xs font-medium backdrop-blur-xs">
                                    <Sparkles className="text-primary mr-1 h-3 w-3" />
                                    UniEspaços
                                </Badge>
                            </div>
                            <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
                                {t('dashboard.welcome', { name: user.name })}
                            </h1>
                            <p className="text-muted-foreground max-w-2xl text-xs sm:text-sm">
                                {user.setor
                                    ? `${user.setor.nome} (${user.setor.sigla}) • ${t('dashboard.actions.assistente_subtitulo')}`
                                    : t('dashboard.actions.assistente_subtitulo')}
                            </p>
                        </div>

                        <div className="bg-background/80 border-border/70 space-y-4 rounded-xl border p-4 backdrop-blur-xs">
                            <ReservaIntencaoFields
                                data={dataIntencao}
                                turno={turnoIntencao}
                                capacidade={capacidadeIntencao}
                                onDataChange={handleDataIntencaoChange}
                                onTurnoChange={setTurnoIntencao}
                                onCapacidadeChange={(valor) => {
                                    setCapacidadeIntencao(valor);
                                }}
                                disponibilidade
                                idPrefix="dashboard-"
                            />

                            <div className="border-border/50 flex flex-col items-stretch justify-between gap-3 border-t pt-3 sm:flex-row sm:items-center">
                                <Button type="button" size="lg" onClick={handleBuscarEspacos} className="h-11 shadow-sm transition-all sm:h-10">
                                    <CalendarPlus className="mr-2 h-4 w-4" />
                                    {t('dashboard.actions.buscar_espacos_disponiveis')}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>

                                <Link
                                    href={route('espacos.index')}
                                    className="text-muted-foreground hover:text-primary inline-flex min-h-11 items-center justify-center gap-1.5 text-xs font-medium transition-colors sm:min-h-9"
                                >
                                    <span>{t('dashboard.actions.explorar_catalogo')}</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
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
