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
import { Andar, Modulo, Unidade } from '@/types';
import { router } from '@inertiajs/react';
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';

declare function route(name: string, params?: unknown): string;

interface FiltroBuscaEspacosProps {
    route: string;
    unidades: Unidade[];
    modulos: Modulo[];
    andares: Andar[];
    filters: {
        search?: string;
        unidade?: string;
        modulo?: string;
        andar?: string;
        capacidade?: string;
    };
    capacidadeEspacos: number[];
}

export default function EspacoFiltroBusca({ route: targetRoute, filters, unidades, modulos, andares, capacidadeEspacos }: FiltroBuscaEspacosProps) {
    const { t } = useTranslation();
    const [localFilters, setLocalFilters] = useState({
        unidade: filters.unidade || 'all',
        modulo: filters.modulo || 'all',
        andar: filters.andar || 'all',
        capacidade: filters.capacidade || 'qualquer',
    });
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const extraParams = useMemo(() => {
        const params: Record<string, string | undefined> = {};
        if (localFilters.unidade && localFilters.unidade !== 'all') params.unidade = localFilters.unidade;
        if (localFilters.modulo && localFilters.modulo !== 'all') params.modulo = localFilters.modulo;
        if (localFilters.andar && localFilters.andar !== 'all') params.andar = localFilters.andar;
        if (localFilters.capacidade && localFilters.capacidade !== 'qualquer') params.capacidade = localFilters.capacidade;
        return params;
    }, [localFilters.unidade, localFilters.modulo, localFilters.andar, localFilters.capacidade]);

    const { searchTerm, setSearchTerm } = useDebouncedSearch({
        routeName: targetRoute,
        initialSearch: filters.search || '',
        extraParams,
        only: ['espacos', 'filters'],
    });

    const filteredModulos = useMemo(() => {
        if (localFilters.unidade === 'all') {
            return [];
        }
        return modulos.filter((m) => m.unidade_id.toString() === localFilters.unidade);
    }, [localFilters.unidade, modulos]);

    const filteredAndares = useMemo(() => {
        if (localFilters.modulo === 'all') {
            return [];
        }
        return andares.filter((a) => a.modulo_id.toString() === localFilters.modulo);
    }, [localFilters.modulo, andares]);

    const executeFilterChange = (newFilters: typeof localFilters, currentSearch: string) => {
        setLocalFilters(newFilters);

        const queryParams: Record<string, string> = {};
        if (currentSearch) queryParams.search = currentSearch;
        if (newFilters.unidade !== 'all') queryParams.unidade = newFilters.unidade;
        if (newFilters.modulo !== 'all') queryParams.modulo = newFilters.modulo;
        if (newFilters.andar !== 'all') queryParams.andar = newFilters.andar;
        if (newFilters.capacidade !== 'qualquer') queryParams.capacidade = newFilters.capacidade;

        const targetUrl =
            targetRoute.startsWith('http://') || targetRoute.startsWith('https://') || targetRoute.startsWith('/') ? targetRoute : route(targetRoute);

        router.get(targetUrl, queryParams, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['espacos', 'filters'],
        });
    };

    const handleFilterChange = (name: 'unidade' | 'modulo' | 'andar' | 'capacidade', value: string) => {
        const newFilters = { ...localFilters, [name]: value };

        if (name === 'unidade') {
            newFilters.modulo = 'all';
            newFilters.andar = 'all';
        }
        if (name === 'modulo') {
            newFilters.andar = 'all';
        }

        executeFilterChange(newFilters, searchTerm);
    };

    const handleClearAllFilters = () => {
        const clearedFilters = {
            unidade: 'all',
            modulo: 'all',
            andar: 'all',
            capacidade: 'qualquer',
        };
        setLocalFilters(clearedFilters);
        setSearchTerm('');

        const targetUrl =
            targetRoute.startsWith('http://') || targetRoute.startsWith('https://') || targetRoute.startsWith('/') ? targetRoute : route(targetRoute);

        router.get(
            targetUrl,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['espacos', 'filters'],
            },
        );
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        executeFilterChange(localFilters, '');
    };

    const hasActiveFilters = useMemo(() => {
        return (
            searchTerm !== '' ||
            localFilters.unidade !== 'all' ||
            localFilters.modulo !== 'all' ||
            localFilters.andar !== 'all' ||
            localFilters.capacidade !== 'qualquer'
        );
    }, [searchTerm, localFilters]);

    const activeFilterChips = useMemo(() => {
        const chips: { key: 'unidade' | 'modulo' | 'andar' | 'capacidade'; label: string }[] = [];

        if (localFilters.unidade !== 'all') {
            const u = unidades.find((item) => item.id.toString() === localFilters.unidade);
            if (u) chips.push({ key: 'unidade', label: t('espacos.filtros.unidade_chip', { sigla: u.sigla }) });
        }
        if (localFilters.modulo !== 'all') {
            const m = modulos.find((item) => item.id.toString() === localFilters.modulo);
            if (m) chips.push({ key: 'modulo', label: `${t('espacos.filtros.modulo')}: ${m.nome}` });
        }
        if (localFilters.andar !== 'all') {
            const a = andares.find((item) => item.id.toString() === localFilters.andar);
            if (a) {
                const nivel = nomeParaNivel(a.nome);
                const label = nivelParaLabel(nivel);
                chips.push({ key: 'andar', label: `${t('espacos.filtros.andar')}: ${label}` });
            }
        }
        if (localFilters.capacidade !== 'qualquer') {
            chips.push({ key: 'capacidade', label: t('espacos.capacidade_chip', { capacidade: localFilters.capacidade }) });
        }

        return chips;
    }, [localFilters, unidades, modulos, andares, t]);

    const quantidadeFiltrosAtivos = activeFilterChips.length + (searchTerm ? 1 : 0);

    const renderFilterSelects = (prefix = '') => (
        <>
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
                        <SelectItem value="all">{t('espacos.filtros.todas_unidades')}</SelectItem>
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
                    disabled={localFilters.unidade === 'all'}
                >
                    <SelectTrigger id={`${prefix}espacos-modulo`} className="w-full">
                        <SelectValue placeholder={t('espacos.filtros.todos_modulos')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('espacos.filtros.todos_modulos')}</SelectItem>
                        {filteredModulos.map((modulo) => (
                            <SelectItem key={modulo.id} value={modulo.id.toString()}>
                                {modulo.nome}
                            </SelectItem>
                        ))}
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
                    disabled={localFilters.modulo === 'all'}
                >
                    <SelectTrigger id={`${prefix}espacos-andar`} className="w-full">
                        <SelectValue placeholder={t('espacos.filtros.todos_andares')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('espacos.filtros.todos_andares')}</SelectItem>
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

            {/* Filtro Capacidade */}
            <div className="space-y-1.5">
                <Label htmlFor={`${prefix}espacos-capacidade`} className="text-muted-foreground text-xs font-medium">
                    {t('espacos.capacidade_minima')}
                </Label>
                <Select
                    value={localFilters.capacidade}
                    onValueChange={(value) => {
                        handleFilterChange('capacidade', value);
                    }}
                >
                    <SelectTrigger id={`${prefix}espacos-capacidade`} className="w-full">
                        <SelectValue placeholder={t('espacos.filtros.qualquer_capacidade')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="qualquer">{t('espacos.filtros.qualquer')}</SelectItem>
                        {capacidadeEspacos.map((capacidade) => (
                            <SelectItem key={capacidade} value={capacidade.toString()}>
                                {capacidade} {t('espacos.filtros.lugares')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </>
    );

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
                                aria-label="Limpar busca"
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
                            <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">{renderFilterSelects('mobile-')}</div>
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
                <div className="hidden grid-cols-2 gap-4 md:grid lg:grid-cols-4">{renderFilterSelects('desktop-')}</div>

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
                                    aria-label="Remover filtro de busca"
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
                                        handleFilterChange(chip.key, chip.key === 'capacidade' ? 'qualquer' : 'all');
                                    }}
                                    aria-label={`Remover filtro de ${chip.key}`}
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
