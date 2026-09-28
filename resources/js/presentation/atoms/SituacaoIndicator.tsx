import { type SituacaoReservaType } from '@/contracts/situacao-reserva.contract';
import { getStatusReservaColor, getStatusReservaText } from '@/lib/utils';

interface SituacaoIndicatorProps {
    situacao: SituacaoReservaType;
}

export function SituacaoIndicator({ situacao }: SituacaoIndicatorProps) {
    return (
        <span className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${getStatusReservaColor(situacao)}`} />
            <span className="text-sm font-medium">{getStatusReservaText(situacao)}</span>
        </span>
    );
}
