import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/i18n';
import { Reserva } from '@/types';
import { CalendarDays, FileText, Mail, Phone, User } from 'lucide-react';
import { ReactNode } from 'react';

interface ReservaInfoCardProps {
    reserva: Reserva;
    children?: ReactNode;
}

export function ReservaInfoCard({ reserva, children }: ReservaInfoCardProps) {
    const { formatDate, t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {reserva.titulo}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('reservas.detalhes.solicitante')}: {reserva.user?.name}
                </CardDescription>
                {reserva.user && (reserva.user.email || reserva.user.telefone) && (
                    <div className="mt-3 space-y-2 text-sm">
                        {reserva.user.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground truncate">{reserva.user.email}</span>
                            </div>
                        )}
                        {reserva.user.telefone && (
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-foreground">{reserva.user.telefone}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="text-muted-foreground h-4 w-4" />
                    <div>
                        <p className="text-muted-foreground text-sm">Período</p>
                        <p className="font-medium">
                            {formatDate(reserva.data_inicial)} até {formatDate(reserva.data_final)}
                        </p>
                    </div>
                </div>
                <Separator />
                <div>
                    <h4 className="text-muted-foreground mb-2 font-medium text-sm">Descrição</h4>
                    <p className="text-foreground text-sm">{reserva.descricao}</p>
                </div>
                {children && (
                    <>
                        <Separator />
                        {children}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
