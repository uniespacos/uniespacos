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
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { useTranslation } from '@/i18n';
import { nivelParaLabel, nomeParaNivel } from '@/lib/utils/andars/AndarHelpers';
import { capacidadeValida, chaveTurnoFiltro, formatarDataFiltro, parseTurnoFiltro } from '@/lib/utils/disponibilidade-filtro';
import { assertNever } from '@/lib/utils/exhaustive';
import { QUALQUER_TURNO_INTENCAO, ReservaIntencaoFields, type TurnoIntencao } from '@/presentation/molecules/ReservaIntencaoFields';
import { Andar, Modulo, Unidade } from '@/types';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

declare function route(name: string, params?: unknown): string;

const SEM_FILTRO = 'all';
const DEBOUNCE_CAPACIDADE_MS = 400;

type ChaveFiltroSelect = 'unidade' | 'modulo' | 'andar';
type ChaveChip = ChaveFiltroSelect | 'capacidade' | 'data' | 'turno';

interface FiltrosLocais {
    unidade: string;
    modulo: string;
    andar: string;
    capacidade: string;
    data: string;
    turno: TurnoIntencao;
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
    turno: QUALQUER_TURNO_INTENCAO,
};

function filtrosDoServidor({ unidade, modulo, andar, capacidade, data, turno }: FiltrosServidor): FiltrosLocais {
    const dataSelecionada = data ?? '';
    return {
        unidade: unidade ?? SEM_FILTRO,
        modulo: modulo ?? SEM_FILTRO,
        andar: andar ?? SEM_FILTRO,
        capacidade: capacidadeValida(capacidade),
        data: dataSelecionada,
        turno: dataSelecionada ? (parseTurnoFiltro(turno) ?? QUALQUER_TURNO_INTENCAO) : QUALQUER_TURNO_INTENCAO,
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
        if (filtros.turno !== QUALQUER_TURNO_INTENCAO) query.turno = filtros.turno;
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
    const { t } = useTranslation();
    const [localFilters, setLocalFilters] = useState<FiltrosLocais>(() => filtrosDoServidor(filters));
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isStep1Minimized, setIsStep1Minimized] = useState(false);
    const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(
        () =>
            Boolean(filters.search) ||
            Boolean(filters.unidade && filters.unidade !== SEM_FILTRO) ||
            Boolean(filters.modulo && filters.modulo !== SEM_FILTRO) ||
            Boolean(filters.andar && filters.andar !== SEM_FILTRO),
    );

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

    const handleCapacidadeChange = (valor: string, imediato = false) => {
        const proximos = { ...localFilters, capacidade: valor };
        if (imediato) {
            executarFiltro(proximos, searchTerm);
            return;
        }
        setLocalFilters(proximos);
        agendarCapacidade();
    };

    const handleDataChange = (data: Date | undefined) => {
        const proximos: FiltrosLocais = {
            ...localFilters,
            data: data ? format(data, 'yyyy-MM-dd') : '',
            turno: data ? localFilters.turno : QUALQUER_TURNO_INTENCAO,
        };
        executarFiltro(proximos, searchTerm);
    };

    const handleTurnoChange = (valor: string) => {
        executarFiltro({ ...localFilters, turno: parseTurnoFiltro(valor) ?? QUALQUER_TURNO_INTENCAO }, searchTerm);
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
                label: t('espacos.filtros.data_chip', { data: formatarDataFiltro(localFilters.data) }),
                nome: t('espacos.filtros.data'),
            });
        }
        if (localFilters.turno !== QUALQUER_TURNO_INTENCAO) {
            chips.push({
                key: 'turno',
                label: t('espacos.filtros.turno_chip', { turno: t(chaveTurnoFiltro(localFilters.turno)) }),
                nome: t('espacos.filtros.turno'),
            });
        }

        return chips;
    }, [localFilters, unidades, modulos, andares, capacidadeAtiva, t]);

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
                handleTurnoChange(QUALQUER_TURNO_INTENCAO);
                break;
            default:
                assertNever(key);
        }
    };

    const quantidadeFiltrosSecundarios =
        (searchTerm ? 1 : 0) +
        (localFilters.unidade !== SEM_FILTRO ? 1 : 0) +
        (localFilters.modulo !== SEM_FILTRO ? 1 : 0) +
        (localFilters.andar !== SEM_FILTRO ? 1 : 0);

    const quantidadeFiltrosAtivos = activeFilterChips.length + (searchTerm ? 1 : 0);

    const resumoMinimizado = useMemo(() => {
        const partes: string[] = [];
        if (localFilters.data) {
            partes.push(formatarDataFiltro(localFilters.data));
        }
        if (localFilters.turno !== QUALQUER_TURNO_INTENCAO) {
            partes.push(t(chaveTurnoFiltro(localFilters.turno)));
        }
        if (capacidadeAtiva) {
            partes.push(t('espacos.pessoas', { count: capacidadeAtiva }));
        }
        return partes.length > 0 ? partes.join(' • ') : t('espacos.filtros.passo1_resumo_vazio');
    }, [localFilters.data, localFilters.turno, capacidadeAtiva, t]);

    const renderSearchField = (prefix = '') => (
        <div className="relative flex-1">
            <Label htmlFor={`${prefix}espacos-busca`} className="sr-only">
                {t('common.actions.search')}
            </Label>
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
                id={`${prefix}espacos-busca`}
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
    );

    const renderLocationSelects = (prefix = '') => (
        <>
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
        </>
    );

    const renderChipsRow = () => {
        if (!hasActiveFilters) return null;

        return (
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
        );
    };

    if (!disponibilidade) {
        return (
            <Card className="border-border/80 mb-6 shadow-xs">
                <CardContent className="space-y-4 p-4">
                    <div className="flex items-center gap-2">
                        {renderSearchField()}

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
                                <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-4">
                                    {renderLocationSelects('mobile-')}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="mobile-espacos-capacidade" className="text-muted-foreground text-xs font-medium">
                                            {t('espacos.filtros.quantas_pessoas')}
                                        </Label>
                                        <Input
                                            id="mobile-espacos-capacidade"
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            step={1}
                                            value={localFilters.capacidade}
                                            onChange={(e) => {
                                                handleCapacidadeChange(e.target.value, false);
                                            }}
                                        />
                                    </div>
                                </div>
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

                    <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">
                        {renderLocationSelects('desktop-')}
                        <div className="space-y-1.5">
                            <Label htmlFor="desktop-espacos-capacidade" className="text-muted-foreground text-xs font-medium">
                                {t('espacos.filtros.quantas_pessoas')}
                            </Label>
                            <Input
                                id="desktop-espacos-capacidade"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                value={localFilters.capacidade}
                                onChange={(e) => {
                                    handleCapacidadeChange(e.target.value, false);
                                }}
                            />
                        </div>
                    </div>

                    {renderChipsRow()}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border/80 mb-6 shadow-xs">
            <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-foreground text-sm font-semibold">{t('espacos.filtros.passo1_titulo')}</h2>
                        {isStep1Minimized && <p className="text-muted-foreground truncate text-xs">{resumoMinimizado}</p>}
                    </div>

                    <div className="flex items-center gap-2">
                        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                            <DrawerTrigger asChild>
                                <Button variant="outline" size="sm" className="relative flex h-10 items-center gap-1.5 md:hidden">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    <span>{t('espacos.filtros.mais_filtros')}</span>
                                    {quantidadeFiltrosSecundarios > 0 && (
                                        <Badge className="bg-primary text-primary-foreground h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                                            {quantidadeFiltrosSecundarios}
                                        </Badge>
                                    )}
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                                <DrawerHeader>
                                    <DrawerTitle>{t('espacos.filtros.mais_filtros')}</DrawerTitle>
                                    <DrawerDescription>{t('espacos.consultar_espacos_desc')}</DrawerDescription>
                                </DrawerHeader>
                                <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-4">
                                    {renderSearchField('mobile-')}
                                    {renderLocationSelects('mobile-')}
                                </div>
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

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-expanded={isMoreFiltersOpen}
                            onClick={() => {
                                setIsMoreFiltersOpen((prev) => !prev);
                            }}
                            className="hidden h-9 items-center gap-1.5 md:inline-flex"
                        >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            <span>{isMoreFiltersOpen ? t('espacos.filtros.ocultar_mais_filtros') : t('espacos.filtros.mais_filtros')}</span>
                            {quantidadeFiltrosSecundarios > 0 && (
                                <Badge className="bg-primary text-primary-foreground h-5 min-w-5 justify-center rounded-full px-1 text-xs">
                                    {quantidadeFiltrosSecundarios}
                                </Badge>
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-expanded={!isStep1Minimized}
                            onClick={() => {
                                setIsStep1Minimized((prev) => !prev);
                            }}
                            className="h-10 gap-1 px-2.5 text-xs font-medium md:h-9"
                        >
                            {isStep1Minimized ? (
                                <>
                                    <span>{t('espacos.filtros.expandir_busca')}</span>
                                    <ChevronDown className="h-4 w-4" />
                                </>
                            ) : (
                                <>
                                    <span>{t('espacos.filtros.minimizar_busca')}</span>
                                    <ChevronUp className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {!isStep1Minimized && (
                    <ReservaIntencaoFields
                        data={localFilters.data}
                        turno={localFilters.turno}
                        capacidade={localFilters.capacidade}
                        onDataChange={handleDataChange}
                        onTurnoChange={handleTurnoChange}
                        onCapacidadeChange={handleCapacidadeChange}
                        disponibilidade
                        idPrefix="desktop-"
                    />
                )}

                {isMoreFiltersOpen && (
                    <div className="border-border/50 hidden space-y-4 border-t pt-4 md:block">
                        {renderSearchField('desktop-')}
                        <div className="grid grid-cols-3 gap-4">{renderLocationSelects('desktop-')}</div>
                    </div>
                )}

                {renderChipsRow()}
            </CardContent>
        </Card>
    );
}
