import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import type { Espaco } from '@/types';

interface LocalReservaProps {
    espaco?: Espaco;
}

export function LocalReserva({ espaco }: LocalReservaProps) {
    if (!espaco) {
        return <span className="text-muted-foreground text-sm">—</span>;
    }

    const modulo = espaco.andar?.modulo?.nome;
    const andar = espaco.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : undefined;
    const detalhe = [modulo, andar].filter(Boolean).join(' - ');

    return (
        <div>
            <p>{espaco.nome}</p>
            {detalhe && <p className="text-muted-foreground text-sm">{detalhe}</p>}
        </div>
    );
}
