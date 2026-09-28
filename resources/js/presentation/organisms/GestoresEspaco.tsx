import { Badge } from '@/components/ui/badge';
import { TURNO_LABEL, TURNOS_ORDENADOS } from '@/constants/turnos';
import { UserAvatar } from '@/presentation/atoms/UserAvatar';
import type { Agenda } from '@/types';

interface GestoresEspacoProps {
    agendas?: Agenda[];
}

export function GestoresEspaco({ agendas }: GestoresEspacoProps) {
    if (!agendas || agendas.length === 0) {
        return <span className="text-muted-foreground text-sm">Nenhum gestor</span>;
    }
    return (
        <div className="flex flex-col gap-1">
            {TURNOS_ORDENADOS.map((turno) => {
                const agenda = agendas.find((item) => item.turno === turno);

                return (
                    <div key={turno} data-testid="turno-linha" className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs" data-testid="turno-label">
                            {TURNO_LABEL[turno]}
                        </Badge>
                        {agenda?.user ? (
                            <div className="flex items-center gap-1">
                                <UserAvatar user={agenda.user} className="h-5 w-5" fallbackClassName="text-[10px]" />
                                <span className="max-w-[120px] truncate text-sm">{agenda.user.name}</span>
                            </div>
                        ) : (
                            <span className="text-muted-foreground text-xs">Sem gestor</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
