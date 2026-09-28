import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TURNOS_ORDENADOS, TURNO_LABEL } from '@/constants/turnos';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { AgendaGestoresPorTurnoType, Espaco } from '@/types';
import { Building2, Home, MapPin, User, Users } from 'lucide-react';

interface AgendaHeaderProps {
    espaco: Espaco;
    gestoresPorTurno: Map<string, AgendaGestoresPorTurnoType>;
}

export default function AgendaHeader({ espaco, gestoresPorTurno }: AgendaHeaderProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Home className="h-5 w-5" />
                    {espaco.nome}
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {espaco.andar?.modulo?.nome}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {espaco.andar?.nome ? getAndarLabelByValue(espaco.andar.nome) : null}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {espaco.capacidade_pessoas} pessoas
                    </Badge>
                </div>
                {espaco.descricao && (
                    <div className="mb-3">
                        <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">Descrição</h4>
                        <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm leading-relaxed">{espaco.descricao}</p>
                    </div>
                )}
                <div className="border-t pt-4">
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Gestores por turno</h3>

                    <dl className="bg-muted/30 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-3">
                        {TURNOS_ORDENADOS.map((turno) => {
                            const gestor = gestoresPorTurno.get(turno);

                            return (
                                <div key={turno} className="flex flex-col gap-1 text-sm">
                                    <dt className="text-muted-foreground text-xs font-semibold">{TURNO_LABEL[turno]}</dt>
                                    <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                                        <User className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                                        {gestor ? (
                                            <div className="min-w-0">
                                                <p className="text-sm leading-snug break-words">{gestor.nome}</p>
                                                {gestor.email && <p className="text-muted-foreground text-xs break-all">{gestor.email}</p>}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Sem gestor</span>
                                        )}
                                    </dd>
                                </div>
                            );
                        })}
                    </dl>
                </div>
            </CardContent>
        </Card>
    );
}
