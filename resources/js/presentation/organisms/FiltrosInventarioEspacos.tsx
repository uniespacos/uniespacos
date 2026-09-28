import { Label } from '@/components/ui/label';
import { ComboboxFiltro } from '@/presentation/molecules/ComboboxFiltro';
import { FiltrosRelatorio, OpcoesInventario } from '@/types';
import { useMemo } from 'react';

interface Props {
    filtros: Partial<FiltrosRelatorio>;
    opcoes: OpcoesInventario;
    onChange: (filtros: Partial<FiltrosRelatorio>) => void;
}

export function FiltrosInventarioEspacos({ filtros, opcoes, onChange }: Props) {
    const modulos = useMemo(
        () => (filtros.unidade_id ? opcoes.modulos.filter((modulo) => modulo.unidade_id === filtros.unidade_id) : opcoes.modulos),
        [opcoes.modulos, filtros.unidade_id],
    );

    const andares = useMemo(() => {
        const idsModulos = new Set(modulos.map((modulo) => modulo.id));

        return filtros.modulo_id
            ? opcoes.andares.filter((andar) => andar.modulo_id === filtros.modulo_id)
            : opcoes.andares.filter((andar) => idsModulos.has(andar.modulo_id));
    }, [opcoes.andares, modulos, filtros.modulo_id]);

    const espacos = useMemo(() => {
        const idsAndares = new Set(andares.map((andar) => andar.id));

        return filtros.andar_id
            ? opcoes.espacos.filter((espaco) => espaco.andar_id === filtros.andar_id)
            : opcoes.espacos.filter((espaco) => idsAndares.has(espaco.andar_id));
    }, [opcoes.espacos, andares, filtros.andar_id]);

    const handleUnidade = (unidade_id?: number) => {
        onChange({
            ...filtros,
            unidade_id,
            modulo_id: undefined,
            andar_id: undefined,
            espaco_id: undefined,
        });
    };

    const handleModulo = (modulo_id?: number) => {
        onChange({ ...filtros, modulo_id, andar_id: undefined, espaco_id: undefined });
    };

    const handleAndar = (andar_id?: number) => {
        onChange({ ...filtros, andar_id, espaco_id: undefined });
    };

    const handleEspaco = (espaco_id?: number) => {
        onChange({ ...filtros, espaco_id });
    };

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
                <Label htmlFor="unidade_id" className="mb-2 block">
                    Unidade
                </Label>
                <ComboboxFiltro
                    id="unidade_id"
                    opcoes={opcoes.unidades}
                    value={filtros.unidade_id}
                    onChange={handleUnidade}
                    placeholder="Todas as unidades"
                    placeholderBusca="Buscar unidade..."
                    vazio="Nenhuma unidade encontrada."
                />
            </div>

            <div>
                <Label htmlFor="modulo_id" className="mb-2 block">
                    Módulo
                </Label>
                <ComboboxFiltro
                    id="modulo_id"
                    opcoes={modulos}
                    value={filtros.modulo_id}
                    onChange={handleModulo}
                    placeholder="Todos os módulos"
                    placeholderBusca="Buscar módulo..."
                    vazio="Nenhum módulo encontrado."
                />
            </div>

            <div>
                <Label htmlFor="andar_id" className="mb-2 block">
                    Andar
                </Label>
                <ComboboxFiltro
                    id="andar_id"
                    opcoes={andares}
                    value={filtros.andar_id}
                    onChange={handleAndar}
                    placeholder="Todos os andares"
                    placeholderBusca="Buscar andar..."
                    vazio="Nenhum andar encontrado."
                />
            </div>

            <div>
                <Label htmlFor="espaco_id" className="mb-2 block">
                    Espaço
                </Label>
                <ComboboxFiltro
                    id="espaco_id"
                    opcoes={espacos}
                    value={filtros.espaco_id}
                    onChange={handleEspaco}
                    placeholder="Todos os espaços"
                    placeholderBusca="Buscar espaço..."
                    vazio="Nenhum espaço encontrado."
                />
            </div>
        </div>
    );
}
