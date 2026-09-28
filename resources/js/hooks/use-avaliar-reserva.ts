import { Reserva } from '@/types';
import { useForm } from '@inertiajs/react';
import type React from 'react';
import { toast } from 'sonner';

declare function route(name: string, params?: unknown): string;

interface UseAvaliarReservaProps {
    reserva: Reserva;
    onSuccess?: () => void;
}

export function useAvaliarReserva({ reserva, onSuccess }: UseAvaliarReservaProps) {
    const existingJustification =
        (reserva as unknown as { existing_justification?: string }).existing_justification ??
        reserva.horarios.find((h) => h.justificativa)?.justificativa ??
        '';

    const form = useForm({
        situacao: reserva.situacao,
        motivo: existingJustification,
        observacao: reserva.observacao ?? '',
        horarios_avaliados: [] as { id: number; status: string }[],
        evaluation_scope: 'recurring' as 'single' | 'recurring',
    });

    const submitEvaluation = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (form.data.situacao === 'indeferida' && !form.data.motivo.trim()) {
            toast.error('Motivo é obrigatório para reservas indeferidas');
            return;
        }

        form.patch(route('gestor.reservas.update', reserva.id), {
            onSuccess: () => {
                toast.success('Reserva avaliada com sucesso!');
                if (onSuccess) onSuccess();
            },
            onError: (errors: Record<string, string>) => {
                toast.error(Object.values(errors)[0] ?? 'Ocorreu um erro.');
            },
        });
    };

    return {
        form,
        submitEvaluation,
    };
}
