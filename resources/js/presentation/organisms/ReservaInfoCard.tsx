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
        <Card className="min-w-0">
            <CardHeader className="min-w-0">
                <CardTitle className="flex min-w-0 items-start gap-2">
                    <FileText className="mt-0.5 h-5 w-5 shrink-0" />
                    <span className="min-w-0 [overflow-wrap:anywhere] break-words">{reserva.titulo}</span>
                </CardTitle>
                <CardDescription className="flex min-w-0 items-center gap-2">
                    <User className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">
                        {t('reservas.detalhes.solicitante')}: {reserva.user?.name}
                    </span>
                </CardDescription>
                {reserva.user && (reserva.user.email || reserva.user.telefone) && (
                    <div className="mt-3 space-y-2 text-sm">
                        {reserva.user.email && (
                            <div className="flex items-center gap-2">
                                <Mail className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                                <span className="text-foreground truncate">{reserva.user.email}</span>
                            </div>
                        )}
                        {reserva.user.telefone && (
                            <div className="flex items-center gap-2">
                                <Phone className="text-muted-foreground h-4 w-4 flex-shrink-0" />
                                <span className="text-foreground">{reserva.user.telefone}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardHeader>
            <CardContent className="min-w-0 space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarDays className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div>
                        <p className="text-muted-foreground text-sm">Período</p>
                        <p className="font-medium">
                            {formatDate(reserva.data_inicial)} {t('reservas.stepper.period_to')} {formatDate(reserva.data_final)}
                        </p>
                    </div>
                </div>
                <Separator />
                <div className="min-w-0">
                    <h4 className="text-muted-foreground mb-2 text-sm font-medium">Descrição</h4>
                    <p className="text-foreground text-sm [overflow-wrap:anywhere] break-words whitespace-pre-wrap">{reserva.descricao}</p>
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
