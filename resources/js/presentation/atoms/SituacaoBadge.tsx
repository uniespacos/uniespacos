import { Badge } from '@/components/ui/badge';
import { ESTILO_SITUACAO } from '@/constants/situacao-reserva';
import { SituacaoReserva, SituacaoReservaType } from '@/contracts/situacao-reserva.contract';
import { useTranslation, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, XSquare } from 'lucide-react';
import type { ComponentType } from 'react';

interface SituacaoBadgeProps {
    situacao: SituacaoReservaType;
    className?: string;
}

const ICONE: Record<SituacaoReservaType, ComponentType<{ className?: string }>> = {
    [SituacaoReserva.EM_ANALISE]: Clock,
    [SituacaoReserva.PARCIALMENTE_DEFERIDA]: CheckCircle,
    [SituacaoReserva.DEFERIDA]: CheckCircle,
    [SituacaoReserva.INDEFERIDA]: XSquare,
    [SituacaoReserva.INATIVA]: XSquare,
};

export function SituacaoBadge({ situacao, className }: SituacaoBadgeProps) {
    const { t } = useTranslation();
    const estilo = ESTILO_SITUACAO[situacao];
    const Icone = ICONE[situacao];

    const labelKey: TranslationKey = `reservas.situacao.${situacao}`;
    const label = t(labelKey) || estilo.label;

    return (
        <Badge variant="outline" className={cn('flex items-center gap-1', estilo.badge, className)}>
            <Icone className="h-3 w-3" />
            {label}
        </Badge>
    );
}
