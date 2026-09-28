import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SituacaoBadge } from '@/presentation/atoms/SituacaoBadge';
import { SituacaoReserva } from '@/types';
import { Link } from '@inertiajs/react';
import { Building, Calendar, Clock, ExternalLink } from 'lucide-react';
import React from 'react';

export interface CalendarSlotHoverCardData {
    reservaId?: number;
    titulo: string;
    solicitanteNome: string;
    solicitanteSetor?: string;
    horarioInicio: string;
    horarioFim: string;
    situacao: SituacaoReserva;
    justificativa?: string | null;
}

export interface CalendarSlotHoverCardProps {
    data: CalendarSlotHoverCardData;
    canViewDetails?: boolean;
}

export const CalendarSlotHoverCard: React.FC<CalendarSlotHoverCardProps> = ({ data, canViewDetails = true }) => {
    const initials =
        data.solicitanteNome
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((n) => n[0])
            .join('')
            .toUpperCase() || 'U';

    return (
        <div className="border-border bg-card text-foreground w-72 space-y-3 rounded-xl border p-3 text-left shadow-xl">
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="border-primary/20 bg-primary/10 h-8 w-8 shrink-0 rounded-lg border">
                        <AvatarFallback className="text-primary text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs leading-tight font-semibold">{data.solicitanteNome}</span>
                        {data.solicitanteSetor && (
                            <span className="text-muted-foreground flex items-center gap-1 truncate text-[11px]">
                                <Building className="h-3 w-3 shrink-0" />
                                {data.solicitanteSetor}
                            </span>
                        )}
                    </div>
                </div>
                <SituacaoBadge situacao={data.situacao} className="shrink-0 px-1.5 py-0.5 text-[10px]" />
            </div>

            <div className="space-y-1.5 text-xs">
                <p className="text-foreground line-clamp-1 flex items-center gap-1.5 font-medium">
                    <Calendar className="text-primary h-3.5 w-3.5 shrink-0" />
                    {data.titulo}
                </p>
                <p className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Clock className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                    {data.horarioInicio} às {data.horarioFim}
                </p>
                {data.justificativa && (
                    <p className="bg-muted/30 text-muted-foreground line-clamp-2 rounded-md p-1.5 text-[11px] italic">
                        &quot;{data.justificativa}&quot;
                    </p>
                )}
            </div>

            {canViewDetails && data.reservaId !== undefined ? (
                <div className="border-border flex justify-end border-t pt-1">
                    <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary h-7 gap-1 px-2 text-xs">
                        <Link href={`/reservas/${String(data.reservaId)}`}>
                            <span>Ver Detalhes</span>
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            ) : null}
        </div>
    );
};

export default CalendarSlotHoverCard;
