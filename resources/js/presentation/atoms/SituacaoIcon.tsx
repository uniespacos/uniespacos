import { SituacaoReserva, SituacaoReservaType } from '@/contracts/situacao-reserva.contract';
import { assertNever } from '@/lib/utils/exhaustive';
import { CheckCircle, Clock, XCircle, XSquare } from 'lucide-react';
import type { ComponentType } from 'react';

interface SituacaoIconProps {
    situacao: SituacaoReservaType;
    className?: string;
}

const ICONE_MAP: Record<SituacaoReservaType, ComponentType<{ className?: string }>> = {
    [SituacaoReserva.EM_ANALISE]: Clock,
    [SituacaoReserva.PARCIALMENTE_DEFERIDA]: CheckCircle,
    [SituacaoReserva.DEFERIDA]: CheckCircle,
    [SituacaoReserva.INDEFERIDA]: XCircle,
    [SituacaoReserva.INATIVA]: XSquare,
};

export function SituacaoIcon({ situacao, className = 'h-4 w-4' }: SituacaoIconProps) {
    const Icone = ICONE_MAP[situacao];

    switch (situacao) {
        case SituacaoReserva.DEFERIDA:
            return <Icone className={`${className} text-success-accent`} />;
        case SituacaoReserva.PARCIALMENTE_DEFERIDA:
            return <Icone className={`${className} text-info-accent`} />;
        case SituacaoReserva.EM_ANALISE:
            return <Icone className={`${className} text-warning-accent`} />;
        case SituacaoReserva.INDEFERIDA:
            return <Icone className={`${className} text-destructive-accent`} />;
        case SituacaoReserva.INATIVA:
            return <Icone className={`${className} text-neutral-accent`} />;
        default:
            return assertNever(situacao);
    }
}
