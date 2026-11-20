import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { type TurnoType } from '@/contracts';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { nivelParaLabel, nomeParaNivel } from '@/lib/utils/andars/AndarHelpers';
import { capacidadeValida, chaveTurnoFiltro, formatarDataFiltro, parseTurnoFiltro } from '@/lib/utils/disponibilidade-filtro';
import { assertNever } from '@/lib/utils/exhaustive';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { Andar, Modulo, Unidade } from '@/types';
import { router } from '@inertiajs/react';
import { format, isBefore, parseISO, startOfToday } from 'date-fns';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

declare function route(name: string, params?: unknown): string;

const SEM_FILTRO = 'all';
const QUALQUER_TURNO = 'qualquer';
const DEBOUNCE_CAPACIDADE_MS = 400;

type TurnoSelecionado = TurnoType | typeof QUALQUER_TURNO;
type ChaveFiltroSelect = 'unidade' | 'modulo' | 'andar';
type ChaveChip = ChaveFiltroSelect | 'capacidade' | 'data' | 'turno';

interface FiltrosLocais {
    unidade: string;
    modulo: string;
    andar: string;
    capacidade: string;
    data: string;
    turno: TurnoSelecionado;
}

interface FiltrosServidor {
    unidade?: string;
    modulo?: string;
    andar?: string;
    capacidade?: string;
    data?: string;
    turno?: string;
}

interface FiltroBuscaEspacosProps {
    route: string;
    unidades: Unidade[];
    modulos: Modulo[];
    andares: Andar[];
    filters: FiltrosServidor & { search?: string };
    disponibilidade?: boolean;
}

const FILTROS_LIMPOS: FiltrosLocais = {
    unidade: SEM_FILTRO,
    modulo: SEM_FILTRO,
    andar: SEM_FILTRO,
    capacidade: '',
    data: '',
    turno: QUALQUER_TURNO,
};

function filtrosDoServidor({ unidade, modulo, andar, capacidade, data, turno }: FiltrosServidor): FiltrosLocais {
    const dataSelecionada = data ?? '';
    return {
        unidade: unidade ?? SEM_FILTRO,
        modulo: modulo ?? SEM_FILTRO,
        andar: andar ?? SEM_FILTRO,
        capacidade: capacidadeValida(capacidade),
        data: dataSelecionada,
        turno: dataSelecionada ? (parseTurnoFiltro(turno) ?? QUALQUER_TURNO) : QUALQUER_TURNO,
    };
}

function montarQuery(filtros: FiltrosLocais, busca: string): Record<string, string> {
    const query: Record<string, string> = {};
    if (busca) query.search = busca;
    if (filtros.unidade !== SEM_FILTRO) query.unidade = filtros.unidade;
    if (filtros.modulo !== SEM_FILTRO) query.modulo = filtros.modulo;
    if (filtros.andar !== SEM_FILTRO) query.andar = filtros.andar;
    const capacidade = capacidadeValida(filtros.capacidade);
    if (capacidade) query.capacidade = capacidade;
    if (filtros.data) {
        query.data = filtros.data;
        if (filtros.turno !== QUALQUER_TURNO) query.turno = filtros.turno;
    }
    return query;
}

export default function EspacoFiltroBusca({
    route: targetRoute,
    filters,
    unidades,
    modulos,
    andares,
    disponibilidade = false,
}: FiltroBuscaEspacosProps) {
    const { t, locale } = useTranslation();
    const [localFilters, setLocalFilters] = useState<FiltrosLocais>(() => filtrosDoServidor(filters));
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { unidade: unidadeServidor, modulo: moduloServidor, andar: andarServidor } = filters;
    const { capacidade: capacidadeServidor, data: dataServidor, turno: turnoServidor } = filters;
    const filtrosServidorNormalizados = useMemo(
        () =>
            filtrosDoServidor({
                unidade: unidadeServidor,
                modulo: moduloServidor,
                andar: andarServidor,
                capacidade: capacidadeServidor,
                data: dataServidor,
                turno: turnoServidor,
            }),
        [unidadeServidor, moduloServidor, andarServidor, capacidadeServidor, dataServidor, turnoServidor],
    );

    const capacidadeAtiva = capacidadeValida(localFilters.capacidade);

    const extraParams = useMemo(() => montarQuery(localFilters, ''), [localFilters]);

    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: targetRoute,
        initialSearch: filters.search ?? '',
        extraParams,
        only: ['espacos', 'filters'],
    });

    const filtrosRef = useRef(localFilters);
    filtrosRef.current = localFilters;
    const buscaRef = useRef(searchTerm);
    buscaRef.current = searchTerm;

    const capacidadeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const cancelarAgendamentoCapacidade = () => {
        clearTimeout(capacidadeTimerRef.current);
        capacidadeTimerRef.current = undefined;
    };

    useEffect(() => {
        return () => {
            clearTimeout(capacidadeTimerRef.current);
        };
    }, []);

    useEffect(() => {
        setLocalFilters((atual) => ({
            ...filtrosServidorNormalizados,
            capacidade: capacidadeTimerRef.current === undefined ? filtrosServidorNormalizados.capacidade : atual.capacidade,
        }));
    }, [filtrosServidorNormalizados]);

    const urlDestino = () =>
        targetRoute.startsWith('http://') || targetRoute.startsWith('https://') || targetRoute.startsWith('/') ? targetRoute : route(targetRoute);

    const visitar = (query: Record<string, string>) => {
        router.get(urlDestino(), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['espacos', 'filters'],
        });
    };

    const executarFiltro = (proximos: FiltrosLocais, busca: string) => {
        cancelarAgendamentoCapacidade();
        setLocalFilters(proximos);
        visitar(montarQuery(proximos, busca));
    };

    const agendarCapacidade = () => {
        cancelarAgendamentoCapacidade();
        capacidadeTimerRef.current = setTimeout(() => {
            capacidadeTimerRef.current = undefined;
            visitar(montarQuery(filtrosRef.current, buscaRef.current));
        }, DEBOUNCE_CAPACIDADE_MS);
    };

    const unidadeSiglaMap = useMemo(() => {
        const map = new Map<number, string>();
        for (const unidade of unidades) {
            map.set(unidade.id, unidade.sigla ?? unidade.nome);
        }
        return map;
    }, [unidades]);

    const filteredModulos = useMemo(() => {
        if (localFilters.unidade === SEM_FILTRO) {
            return modulos;
        }
        return modulos.filter((m) => m.unidade_id.toString() === localFilters.unidade);
    }, [localFilters.unidade, modulos]);

    const filteredAndares = useMemo(() => {
        if (localFilters.modulo === SEM_FILTRO) {
            return [];
        }
        return andares.filter((a) => a.modulo_id.toString() === localFilters.modulo);
    }, [localFilters.modulo, andares]);

    const handleFilterChange = (name: ChaveFiltroSelect, value: string) => {
        const proximos: FiltrosLocais = { ...localFilters, [name]: value };

        if (name === 'unidade') {
            proximos.modulo = SEM_FILTRO;
            proximos.andar = SEM_FILTRO;
        }
        if (name === 'modulo') {
            proximos.andar = SEM_FILTRO;
        }

        executarFiltro(proximos, searchTerm);
    };

    const handleCapacidadeChange = (valor: string) => {
        setLocalFilters((atual) => ({ ...atual, capacidade: valor }));
        agendarCapacidade();
    };

    const handleDataChange = (data: Date | undefined) => {
        const proximos: FiltrosLocais = {
            ...localFilters,
            data: data ? format(data, 'yyyy-MM-dd') : '',
            turno: data ? localFilters.turno : QUALQUER_TURNO,
        };
        executarFiltro(proximos, searchTerm);
    };

    const handleTurnoChange = (valor: string) => {
        executarFiltro({ ...localFilters, turno: parseTurnoFiltro(valor) ?? QUALQUER_TURNO }, searchTerm);
    };

    const handleClearAllFilters = () => {
        cancelarAgendamentoCapacidade();
        setLocalFilters(FILTROS_LIMPOS);
        setSearchTerm('');
        visitar({});
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        executarFiltro(localFilters, '');
    };

    const hasActiveFilters =
        searchTerm !== '' ||
        localFilters.unidade !== SEM_FILTRO ||
        localFilters.modulo !== SEM_FILTRO ||
        localFilters.andar !== SEM_FILTRO ||
        capacidadeAtiva !== '' ||
        localFilters.data !== '';

    const activeFilterChips = useMemo(() => {
        const chips: { key: ChaveChip; label: string; nome: string }[] = [];

        if (localFilters.unidade !== SEM_FILTRO) {
            const u = unidades.find((item) => item.id.toString() === localFilters.unidade);
            if (u)
                chips.push({
                    key: 'unidade',
                    label: t('espacos.filtros.unidade_chip', { sigla: u.sigla ?? u.nome }),
                    nome: t('espacos.filtros.unidade'),
                });
        }
        if (localFilters.modulo !== SEM_FILTRO) {
            const m = modulos.find((item) => item.id.toString() === localFilters.modulo);
            if (m) chips.push({ key: 'modulo', label: t('espacos.filtros.modulo_chip', { nome: m.nome }), nome: t('espacos.filtros.modulo') });
        }
        if (localFilters.andar !== SEM_FILTRO) {
            const a = andares.find((item) => item.id.toString() === localFilters.andar);
            if (a) {
                const nivel = nomeParaNivel(a.nome);
                const label = nivelParaLabel(nivel);
                chips.push({ key: 'andar', label: t('espacos.filtros.andar_chip', { nome: label }), nome: t('espacos.filtros.andar') });
            }
        }
        if (capacidadeAtiva) {
            chips.push({
                key: 'capacidade',
                label: t('espacos.capacidade_chip', { capacidade: capacidadeAtiva }),
                nome: t('espacos.filtros.capacidade_nome'),
            });
        }
        if (localFilters.data) {
            chips.push({
                key: 'data',
                label: t('espacos.filtros.data_chip', { data: formatarDataFiltro(localFilters.data, locale) }),
                nome: t('espacos.filtros.data'),
            });
        }
        if (localFilters.turno !== QUALQUER_TURNO) {
            chips.push({
                key: 'turno',
                label: t('espacos.filtros.turno_chip', { turno: t(chaveTurnoFiltro(localFilters.turno)) }),
                nome: t('espacos.filtros.turno'),
            });
        }

        return chips;
    }, [localFilters, unidades, modulos, andares, capacidadeAtiva, t, locale]);

    const handleRemoverChip = (key: ChaveChip) => {
        switch (key) {
            case 'unidade':
            case 'modulo':
            case 'andar':
                handleFilterChange(key, SEM_FILTRO);
                break;
            case 'capacidade':
                executarFiltro({ ...localFilters, capacidade: '' }, searchTerm);
                break;
            case 'data':
                handleDataChange(undefined);
                break;
            case 'turno':
                handleTurnoChange(QUALQUER_TURNO);
                break;
            default:
                assertNever(key);
        }
    };

    const quantidadeFiltrosAtivos = activeFilterChips.length + (searchTerm ? 1 : 0);

    const renderFilterFields = (prefix = '') => {
        const modalNoDrawer = prefix === 'mobile-';

        return (
            <>
                {disponibilidade && (
                    <>
                        {/* Filtro Quando (data) */}
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}espacos-data`} className="text-muted-foreground text-xs font-medium">
                                {t('espacos.filtros.quando')}
                            </Label>
                            <DatePicker
                                id={`${prefix}espacos-data`}
                                value={localFilters.data ? parseISO(localFilters.data) : undefined}
                                onSelect={handleDataChange}
                                disabled={(date) => isBefore(date, startOfToday())}
                                modal={modalNoDrawer}
                                placeholder={t('espacos.filtros.selecione_data')}
                                className="border-input hover:text-foreground h-9 bg-transparent px-3 py-2 text-sm hover:bg-transparent dark:bg-transparent dark:hover:bg-transparent"
                            />
                        </div>

                        {/* Filtro Turno */}
                        <div className="space-y-1.5">
                            <Label htmlFor={`${prefix}espacos-turno`} className="text-muted-foreground text-xs font-medium">
                                {t('espacos.filtros.turno')}
                            </Label>
                            <Select value={localFilters.turno} onValueChange={handleTurnoChange} disabled={!localFilters.data}>
                                <SelectTrigger id={`${prefix}espacos-turno`} className="w-full">
                                    <SelectValue placeholder={t('espacos.filtros.qualquer_turno')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={QUALQUER_TURNO}>{t('espacos.filtros.qualquer_turno')}</SelectItem>
                                    {TURNOS_ORDENADOS.map((turno) => (
                                        <SelectItem key={turno} value={turno}>
                                            {t(chaveTurnoFiltro(turno))}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                {/* Filtro Unidade */}
                <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}espacos-unidade`} className="text-muted-foreground text-xs font-medium">
                        {t('espacos.filtros.unidade')}
                    </Label>
                    <Select
                        value={localFilters.unidade}
                        onValueChange={(value) => {
                            handleFilterChange('unidade', value);
                        }}
                    >
                        <SelectTrigger id={`${prefix}espacos-unidade`} className="w-full">
                            <SelectValue placeholder={t('espacos.filtros.todas_unidades')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SEM_FILTRO}>{t('espacos.filtros.todas_unidades')}</SelectItem>
                            {unidades.map((unidade) => (
                                <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                    {unidade.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro Módulo */}
                <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}espacos-modulo`} className="text-muted-foreground text-xs font-medium">
                        {t('espacos.filtros.modulo')}
                    </Label>
                    <Select
                        value={localFilters.modulo}
                        onValueChange={(value) => {
                            handleFilterChange('modulo', value);
                        }}
                        disabled={filteredModulos.length === 0}
                    >
                        <SelectTrigger id={`${prefix}espacos-modulo`} className="w-full">
                            <SelectValue placeholder={t('espacos.filtros.todos_modulos')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SEM_FILTRO}>{t('espacos.filtros.todos_modulos')}</SelectItem>
                            {filteredModulos.map((modulo) => {
                                const unidadeSigla =
                                    localFilters.unidade === SEM_FILTRO && unidades.length > 1 ? unidadeSiglaMap.get(modulo.unidade_id) : undefined;
                                return (
                                    <SelectItem key={modulo.id} value={modulo.id.toString()}>
                                        {unidadeSigla ? `${modulo.nome} (${unidadeSigla})` : modulo.nome}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro Andar */}
                <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}espacos-andar`} className="text-muted-foreground text-xs font-medium">
                        {t('espacos.filtros.andar')}
                    </Label>
                    <Select
                        value={localFilters.andar}
                        onValueChange={(value) => {
                            handleFilterChange('andar', value);
                        }}
                        disabled={localFilters.modulo === SEM_FILTRO}
                    >
                        <SelectTrigger id={`${prefix}espacos-andar`} className="w-full">
                            <SelectValue placeholder={t('espacos.filtros.todos_andares')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={SEM_FILTRO}>{t('espacos.filtros.todos_andares')}</SelectItem>
                            {filteredAndares.map((andar) => {
                                const nivel = nomeParaNivel(andar.nome);
                                const label = nivelParaLabel(nivel);
                                return (
                                    <SelectItem key={andar.id} value={andar.id.toString()}>
                                        {label}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                {/* Filtro Quantas pessoas (capacidade mínima) */}
                <div className="space-y-1.5">
                    <Label htmlFor={`${prefix}espacos-capacidade`} className="text-muted-foreground text-xs font-medium">
                        {t('espacos.filtros.quantas_pessoas')}
                    </Label>
                    <Input
                        id={`${prefix}espacos-capacidade`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        step={1}
                        value={localFilters.capacidade}
                        onChange={(e) => {
                            handleCapacidadeChange(e.target.value);
                        }}
                    />
                </div>
            </>
        );
    };

    return (
        <Card className="border-border/80 mb-6 shadow-xs">
            <CardContent className="space-y-4 p-4">
                {/* Linha de Busca e Gatilho do Drawer Mobile */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Label htmlFor="espacos-busca" className="sr-only">
                            {t('common.actions.search')}
                        </Label>
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            id="espacos-busca"
                            placeholder={t('espacos.filtros.buscar')}
                            className="pr-9 pl-9"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                            }}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                aria-label={t('espacos.filtros.limpar_busca')}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Drawer de Filtros no Mobile (< md) */}
                    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                        <DrawerTrigger asChild>
                            <Button variant="outline" className="relative flex items-center gap-2 md:hidden">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span>{t('espacos.filtros.filtros_button')}</span>
                                {quantidadeFiltrosAtivos > 0 && (
                                    <Badge className="bg-primary text-primary-foreground h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                                        {quantidadeFiltrosAtivos}
                                    </Badge>
                                )}
                            </Button>
                        </DrawerTrigger>
                        <DrawerContent>
                            <DrawerHeader>
                                <DrawerTitle>{t('common.actions.filter')}</DrawerTitle>
                                <DrawerDescription>{t('espacos.consultar_espacos_desc')}</DrawerDescription>
                            </DrawerHeader>
                            <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-4">{renderFilterFields('mobile-')}</div>
                            <DrawerFooter>
                                <DrawerClose asChild>
                                    <Button className="w-full">{t('common.actions.filter')}</Button>
                                </DrawerClose>
                                {hasActiveFilters && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            handleClearAllFilters();
                                            setIsDrawerOpen(false);
                                        }}
                                        className="w-full"
                                    >
                                        {t('espacos.limpar_filtros')}
                                    </Button>
                                )}
                            </DrawerFooter>
                        </DrawerContent>
                    </Drawer>
                </div>

                {/* Filtros em Grid no Desktop (>= md) */}
                <div className={cn('hidden grid-cols-2 gap-4 md:grid', disponibilidade ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
                    {renderFilterFields('desktop-')}
                </div>

                {/* Pílulas de Filtros Ativos */}
                {hasActiveFilters && (
                    <div className="border-border/40 flex flex-wrap items-center gap-2 border-t pt-3">
                        <span className="text-muted-foreground text-xs">{t('espacos.filtros.filtros_ativos')}</span>
                        {searchTerm && (
                            <Badge
                                variant="secondary"
                                className="bg-secondary text-secondary-foreground flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal"
                            >
                                <span>{t('espacos.filtros.busca_chip', { query: searchTerm })}</span>
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    aria-label={t('espacos.filtros.remover_filtro', { filtro: t('espacos.filtros.busca_label') })}
                                    className="text-muted-foreground hover:text-foreground rounded-full"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        )}
                        {activeFilterChips.map((chip) => (
                            <Badge
                                key={chip.key}
                                variant="secondary"
                                className="bg-secondary text-secondary-foreground flex items-center gap-1.5 px-2.5 py-1 text-xs font-normal"
                            >
                                <span>{chip.label}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleRemoverChip(chip.key);
                                    }}
                                    aria-label={t('espacos.filtros.remover_filtro', { filtro: chip.nome })}
                                    className="text-muted-foreground hover:text-foreground rounded-full"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClearAllFilters}
                            className="text-muted-foreground hover:text-foreground h-7 gap-1 px-2 text-xs"
                        >
                            <RotateCcw className="h-3 w-3" />
                            {t('espacos.filtros.limpar_tudo')}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
