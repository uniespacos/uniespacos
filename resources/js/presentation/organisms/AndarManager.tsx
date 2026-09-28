import { Button } from '@/components/ui/button';
import {
    criarNovoAndar,
    getAndaresRemovíveis,
    getProximoAndarParaRemover,
    nivelParaLabel,
    ordenarAndares,
    podeAdicionarSubsolo,
    podeAdicionarSuperior,
    proximoNivelSubsolo,
    proximoNivelSuperior,
} from '@/lib/utils/andars/AndarHelpers';
import AndarCard, { AndarFormData } from '@/presentation/organisms/AndarFormCard';
import { ArrowDown, ArrowUp, Building, Info } from 'lucide-react';

interface AndaresManagerProps {
    andares: AndarFormData[];
    onUpdate: (andarId: string, andar: AndarFormData) => void;
    onRemove: (andarId: string) => void;
    onAdd: (andar: AndarFormData) => void;
    errors?: Record<string, string>;
    processing: boolean;
}

export default function AndaresManager({ andares, onUpdate, onRemove, onAdd, errors, processing }: AndaresManagerProps) {
    const andaresOrdenados = ordenarAndares(andares);
    const podeAdicionarAcima = podeAdicionarSuperior(andares);
    const podeAdicionarAbaixo = podeAdicionarSubsolo(andares);
    const andaresRemovíveis = getAndaresRemovíveis(andares);
    const proximoParaRemover = getProximoAndarParaRemover(andares);

    const handleAdicionarSuperior = () => {
        const proximoNivel = proximoNivelSuperior(andares);
        const novoAndar = criarNovoAndar(proximoNivel);
        onAdd(novoAndar);
    };

    const handleAdicionarSubsolo = () => {
        const proximoNivel = proximoNivelSubsolo(andares);
        const novoAndar = criarNovoAndar(proximoNivel);
        onAdd(novoAndar);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdicionarSuperior}
                    disabled={!podeAdicionarAcima || processing}
                    className="flex items-center gap-2 bg-transparent"
                >
                    <ArrowUp className="h-4 w-4" />
                    Adicionar Andar Superior
                    {podeAdicionarAcima && (
                        <span className="bg-muted rounded px-2 py-1 text-xs">{nivelParaLabel(proximoNivelSuperior(andares))}</span>
                    )}
                </Button>

                <Button
                    type="button"
                    variant="outline"
                    onClick={handleAdicionarSubsolo}
                    disabled={!podeAdicionarAbaixo || processing}
                    className="flex items-center gap-2 bg-transparent"
                >
                    <ArrowDown className="h-4 w-4" />
                    Adicionar Subsolo
                    {podeAdicionarAbaixo && (
                        <span className="bg-muted rounded px-2 py-1 text-xs">{nivelParaLabel(proximoNivelSubsolo(andares))}</span>
                    )}
                </Button>
            </div>

            <div className="space-y-2 text-center">
                <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                    <Building className="h-4 w-4" />
                    <span>
                        {andares.length} andar{andares.length !== 1 ? 'es' : ''} configurado{andares.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {andares.length > 1 && (
                    <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
                        <Info className="h-3 w-3" />
                        <span>
                            {andaresRemovíveis.length === 0
                                ? 'Apenas o térreo pode permanecer'
                                : proximoParaRemover
                                  ? `Próximo andar removível: ${nivelParaLabel(proximoParaRemover.nivel)}`
                                  : 'Remova andares seguindo a sequência'}
                        </span>
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {andaresOrdenados.map((andar, index) => (
                    <AndarCard
                        key={andar.id}
                        andar={andar}
                        index={index}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                        todosAndares={andares}
                        errors={errors}
                    />
                ))}
            </div>

            <div className="space-y-1 text-center">
                {!podeAdicionarAcima && <p className="text-warning-accent text-xs">⚠️ Máximo de 10 andares superiores atingido</p>}
                {!podeAdicionarAbaixo && <p className="text-warning-accent text-xs">⚠️ Máximo de 2 subsolos atingido</p>}
            </div>

            {errors?.andares && <p className="text-destructive-accent text-center text-sm">{errors.andares}</p>}
        </div>
    );
}
