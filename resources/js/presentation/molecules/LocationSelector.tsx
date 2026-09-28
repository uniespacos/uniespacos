import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SelectContent, SelectItem, SelectTrigger, Select as SelectUI, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { nivelParaLabel, nomeParaNivel } from '@/lib/utils/andars/AndarHelpers';
import { Plus } from 'lucide-react';
import { Andar, Modulo, Unidade } from '@/types';

interface LocationSelectorProps {
    unidades: Unidade[];
    modulos: Modulo[];
    andares: Andar[];
    unidadeSelecionada: number | undefined;
    setUnidadeSelecionada: (id: number | undefined) => void;
    moduloSelecionado: number | undefined;
    handleModuloChange: (id: number | undefined) => void;
    andarSelecionado: number | undefined;
    handleAndarChange: (id: string | undefined) => void;
    processing: boolean;
    errors: {
        unidade_id?: string;
        modulo_id?: string;
        andar_id?: string;
    };
}

export function LocationSelector({
    unidades,
    modulos,
    andares,
    unidadeSelecionada,
    setUnidadeSelecionada,
    moduloSelecionado,
    handleModuloChange,
    andarSelecionado,
    handleAndarChange,
    processing,
    errors,
}: LocationSelectorProps) {
    const tiposDeAcessoDoAndar = andares.find((andar) => andar.id == andarSelecionado)?.tipo_acesso || [];

    return (
        <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="unidade_id">Unidade</Label>
                    <SelectUI
                        value={unidadeSelecionada?.toString()}
                        onValueChange={(value) => {
                            setUnidadeSelecionada(parseInt(value));
                        }}
                        disabled={processing}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione uma unidade" />
                        </SelectTrigger>
                        <SelectContent>
                            {unidades.map((unidade) => (
                                <SelectItem key={unidade.id.toString()} value={unidade.id.toString()}>
                                    {unidade.nome}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </SelectUI>
                    {errors.unidade_id && <p className="text-destructive-accent mt-1 text-sm">{errors.unidade_id}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="module_id">Módulo</Label>
                    <SelectUI
                        value={moduloSelecionado?.toString()}
                        onValueChange={(value) => {
                            handleModuloChange(parseInt(value));
                        }}
                        disabled={!unidadeSelecionada || processing}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={unidadeSelecionada ? 'Selecione um módulo' : 'Selecione uma unidade primeiro'} />
                        </SelectTrigger>
                        <SelectContent>
                            {modulos
                                .filter((modulo) => modulo.unidade?.id == unidadeSelecionada)
                                .map((modulo) => (
                                    <SelectItem key={modulo.id.toString()} value={modulo.id.toString()}>
                                        {modulo.nome}
                                    </SelectItem>
                                ))}
                        </SelectContent>
                    </SelectUI>
                    {errors.modulo_id && <p className="text-destructive-accent mt-1 text-sm">{errors.modulo_id}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="andar_id">Andar</Label>
                    <div className="flex gap-2">
                        <SelectUI value={andarSelecionado?.toString()} onValueChange={handleAndarChange} disabled={!moduloSelecionado || processing}>
                            <SelectTrigger>
                                <SelectValue placeholder={moduloSelecionado ? 'Selecione um andar' : 'Selecione um módulo primeiro'} />
                            </SelectTrigger>
                            <SelectContent>
                                {andares
                                    .filter((andar) => andar.modulo?.id == moduloSelecionado)
                                    .map((andar) => (
                                        <SelectItem key={andar.id.toString()} value={andar.id.toString()}>
                                            {nivelParaLabel(nomeParaNivel(andar.nome))}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </SelectUI>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button type="button" variant="outline" size="icon" disabled aria-disabled="true">
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cadastro de andar temporariamente indisponível</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {errors.andar_id && <p className="text-destructive-accent mt-1 text-sm">{errors.andar_id}</p>}
                </div>

                <div className="space-y-2">
                    <Label>Tipos de Acesso do Andar</Label>
                    <div className="border-input bg-muted/50 flex min-h-[40px] flex-wrap items-center gap-2 rounded-md border px-3 py-2">
                        {tiposDeAcessoDoAndar.length > 0 ? (
                            tiposDeAcessoDoAndar.map((tipo) => (
                                <Badge key={tipo} variant="secondary">
                                    {tipo}
                                </Badge>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-sm">Selecione um andar para ver os acessos</p>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
