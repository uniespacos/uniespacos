import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Reserva } from '@/types';
import { Pencil } from 'lucide-react';

interface AgendaEditModeAlertProps {
    reserva: Reserva;
}

export default function AgendaEditModeAlert({ reserva }: AgendaEditModeAlertProps) {
    return (
        <Alert variant="default" className="border-warning-accent/30 bg-warning-subtle text-warning-accent">
            <Pencil className="!text-warning-accent h-4 w-4" />
            <AlertTitle className="!text-warning-accent font-semibold">Modo de Edição</AlertTitle>
            <AlertDescription className="!text-warning-accent">
                Você está editando a reserva: <strong>Titulo: {reserva.titulo} </strong> As alterações nos horários e detalhes serão salvas nesta
                reserva.
            </AlertDescription>
        </Alert>
    );
}
