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
import {
    ModoArquivo,
    type ModoArquivoType,
    OrdenacaoReserva,
    type OrdenacaoReservaType,
    SituacaoReserva,
    type SituacaoReservaType,
} from '@/contracts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTranslation } from '@/i18n';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { ViewMode, ViewModeToggle } from '@/presentation/molecules/ViewModeToggle';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ReservasFiltersProps {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    selectedSituacao: SituacaoReservaType | '';
    onSituacaoChange: (value: SituacaoReservaType | '') => void;
    /** Eixo de arquivamento: 'ativas' | 'arquivadas' | 'todas'. */
    selectedArquivo: ModoArquivoType;
    onArquivoChange: (value: ModoArquivoType) => void;
    /** Critério de ordenação: 'data_solicitacao' | 'situacao'. */
    selectedOrdenar: OrdenacaoReservaType;
    onOrdenarChange: (value: OrdenacaoReservaType) => void;
    selectedDate?: Date;
    onDateChange?: (date: Date | undefined) => void;
    viewMode?: ViewMode;
    onViewModeChange?: (mode: ViewMode) => void;
}

export function ReservasFilters({
    searchTerm,
    onSearchTermChange,
    selectedSituacao,
    onSituacaoChange,
    selectedArquivo,
    onArquivoChange,
    selectedOrdenar,
    onOrdenarChange,
    selectedDate,
    onDateChange,
    viewMode,
    onViewModeChange,
}: ReservasFiltersProps) {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const quantidadeFiltrosAtivos = useMemo(() => {
        let count = 0;
        if (selectedSituacao !== '') count++;
        if (selectedArquivo !== ModoArquivo.ATIVAS) count++;
        if (selectedOrdenar !== OrdenacaoReserva.DATA_SOLICITACAO) count++;
        if (selectedDate !== undefined) count++;
        return count;
    }, [selectedSituacao, selectedArquivo, selectedOrdenar, selectedDate]);

    const renderFilterControls = () => (
        <>
            <div className="space-y-1.5">
                <Label htmlFor="reservas-situacao" className="text-muted-foreground text-xs font-medium">
                    {t('reservas.filtros.situacao')}
                </Label>
                <Select
                    value={selectedSituacao || 'todas'}
                    onValueChange={(value) => {
                        onSituacaoChange(value === 'todas' ? '' : (value as SituacaoReservaType));
                    }}
                >
                    <SelectTrigger id="reservas-situacao" className="w-full" aria-label={t('reservas.filtros.situacao')}>
                        <SelectValue placeholder={t('reservas.filtros.situacao')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todas">{t('reservas.filtros.todas_situacoes')}</SelectItem>
                        <SelectItem value={SituacaoReserva.EM_ANALISE}>{t('reservas.situacao.em_analise')}</SelectItem>
                        <SelectItem value={SituacaoReserva.INDEFERIDA}>{t('reservas.situacao.indeferida')}</SelectItem>
                        <SelectItem value={SituacaoReserva.PARCIALMENTE_DEFERIDA}>{t('reservas.situacao.parcialmente_deferida')}</SelectItem>
                        <SelectItem value={SituacaoReserva.DEFERIDA}>{t('reservas.situacao.deferida')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="reservas-exibir" className="text-muted-foreground text-xs font-medium">
                    {t('reservas.filtros.exibir')}
                </Label>
                <Select
                    value={selectedArquivo}
                    onValueChange={(value) => {
                        onArquivoChange(value as ModoArquivoType);
                    }}
                >
                    <SelectTrigger id="reservas-exibir" className="w-full" aria-label={t('reservas.filtros.exibir')}>
                        <SelectValue placeholder={t('reservas.filtros.exibir')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ModoArquivo.ATIVAS}>{t('reservas.arquivo.ativas')}</SelectItem>
                        <SelectItem value={ModoArquivo.ARQUIVADAS}>{t('reservas.arquivo.arquivadas')}</SelectItem>
                        <SelectItem value={ModoArquivo.TODAS}>{t('reservas.arquivo.todas')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="reservas-ordenar" className="text-muted-foreground text-xs font-medium">
                    {t('reservas.filtros.ordenar_por')}
                </Label>
                <Select
                    value={selectedOrdenar}
                    onValueChange={(value) => {
                        onOrdenarChange(value as OrdenacaoReservaType);
                    }}
                >
                    <SelectTrigger id="reservas-ordenar" className="w-full" aria-label={t('reservas.filtros.ordenar_por')}>
                        <SelectValue placeholder={t('reservas.filtros.ordenar_por')} />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={OrdenacaoReserva.DATA_SOLICITACAO}>{t('reservas.ordenar.data_solicitacao')}</SelectItem>
                        <SelectItem value={OrdenacaoReserva.SITUACAO}>{t('reservas.ordenar.situacao')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="reservas-data" className="text-muted-foreground text-xs font-medium">
                    {t('reservas.filtros.data')}
                </Label>
                <DatePicker
                    id="reservas-data"
                    value={selectedDate}
                    onSelect={(date) => {
                        onDateChange?.(date);
                    }}
                    placeholder={t('reservas.filtros.todas_datas')}
                    align="end"
                    clearable
                />
            </div>
        </>
    );

    if (isMobile) {
        return (
            <Card className="w-full">
                <CardContent className="flex flex-col gap-4 p-4">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                id="reservas-busca"
                                type="search"
                                placeholder={t('reservas.filtros.busca_placeholder')}
                                className="w-full pl-9"
                                value={searchTerm}
                                onChange={(e) => {
                                    onSearchTermChange(e.target.value);
                                }}
                            />
                        </div>

                        <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                            <DrawerTrigger asChild>
                                <Button variant="outline" className="relative flex items-center gap-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    <span className="sr-only">{t('reservas.filtros.filtros_button')}</span>
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
                                    <DrawerDescription>{t('reservas.filtros.descricao_filtros')}</DrawerDescription>
                                </DrawerHeader>
                                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-4">{renderFilterControls()}</div>
                                <DrawerFooter>
                                    <DrawerClose asChild>
                                        <Button className="w-full">{t('common.actions.filter')}</Button>
                                    </DrawerClose>
                                </DrawerFooter>
                            </DrawerContent>
                        </Drawer>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardContent className="flex flex-col gap-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            id="reservas-busca"
                            type="search"
                            placeholder={t('reservas.filtros.busca_placeholder')}
                            className="w-full pl-9"
                            value={searchTerm}
                            onChange={(e) => {
                                onSearchTermChange(e.target.value);
                            }}
                        />
                    </div>
                    {viewMode && onViewModeChange && (
                        <div className="shrink-0 self-end sm:self-auto">
                            <ViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{renderFilterControls()}</div>
            </CardContent>
        </Card>
    );
}
