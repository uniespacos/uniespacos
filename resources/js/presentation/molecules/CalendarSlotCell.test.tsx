import { TooltipProvider } from '@/components/ui/tooltip';
import CalendarSlotCell from '@/presentation/molecules/CalendarSlotCell';
import { SlotCalendario } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';

describe('CalendarSlotCell', () => {
    const slotLivre: SlotCalendario = {
        id: '2026-09-07|07:30:00',
        status: 'livre',
        data: new Date('2026-09-07T12:00:00'),
        horario_inicio: '07:30:00',
        horario_fim: '08:20:00',
        agenda_id: 1,
    };

    const slotReservado: SlotCalendario = {
        id: '2026-09-07|08:20:00',
        status: 'reservado',
        data: new Date('2026-09-07T12:00:00'),
        horario_inicio: '08:20:00',
        horario_fim: '09:10:00',
        dadosReserva: {
            autor: 'Maria Santos',
            reserva_titulo: 'Defesa de TCC',
            horarioDB: {
                id: 10,
                data: '2026-09-07',
                horario_inicio: '08:20:00',
                horario_fim: '09:10:00',
                situacao: 'deferida',
                validation_status: 'completed',
                conflict_cache: null,
                cache_validated_at: null,
                reserva: {
                    id: 99,
                    titulo: 'Defesa de TCC',
                    descricao: 'Banca examinadora',
                    situacao: 'deferida',
                    data_inicial: new Date('2026-09-07'),
                    data_final: new Date('2026-09-07'),
                    recorrencia: 'unica',
                    observacao: null,
                    created_at: '',
                    updated_at: '',
                    horarios: [],
                    user: {
                        id: 5,
                        name: 'Maria Santos',
                        email: 'maria@uesb.edu.br',
                        email_verified_at: null,
                        telefone: '77999999999',
                        roles: ['institucional'],
                        permissions: [],
                        setor_id: 2,
                        setor: { id: 2, nome: 'Departamento de Ciências', sigla: 'DC' },
                        unread_notifications: [],
                        created_at: '',
                        updated_at: '',
                    },
                },
            },
        },
    };

    it('permite seleção quando o slot está livre', () => {
        const onSelect = jest.fn();
        const { container } = render(
            <TooltipProvider>
                <CalendarSlotCell slot={slotLivre} isSelecionado={false} onSelect={onSelect} />
            </TooltipProvider>,
        );

        const cell = container.firstElementChild as HTMLElement;
        fireEvent.click(cell);

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it('exibe texto de selecionado quando isSelecionado é true', () => {
        render(
            <TooltipProvider>
                <CalendarSlotCell slot={slotLivre} isSelecionado={true} onSelect={jest.fn()} />
            </TooltipProvider>,
        );

        expect(screen.getByText('Selecionado')).toBeInTheDocument();
    });

    it('não permite clique quando o slot está reservado', () => {
        const onSelect = jest.fn();
        render(
            <TooltipProvider>
                <CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelect={onSelect} />
            </TooltipProvider>,
        );

        fireEvent.click(screen.getByText(/Defesa de TCC/));

        expect(onSelect).not.toHaveBeenCalled();
    });

    it('renderiza o título da reserva no slot reservado', () => {
        render(
            <TooltipProvider>
                <CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelect={jest.fn()} />
            </TooltipProvider>,
        );

        expect(screen.getByText('Defesa de TCC')).toBeInTheDocument();
    });

    it('não permite clique em slots passados ou bloqueados', () => {
        const onSelect = jest.fn();
        const slotPassado: SlotCalendario = {
            ...slotLivre,
            isPast: true,
        };

        const { container } = render(
            <TooltipProvider>
                <CalendarSlotCell slot={slotPassado} isSelecionado={false} onSelect={onSelect} />
            </TooltipProvider>,
        );

        const el = container.firstElementChild as HTMLElement;
        fireEvent.click(el);

        expect(onSelect).not.toHaveBeenCalled();
    });
});
