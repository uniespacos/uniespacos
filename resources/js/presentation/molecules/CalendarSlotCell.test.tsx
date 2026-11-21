import { TooltipProvider } from '@/components/ui/tooltip';
import CalendarSlotCell from '@/presentation/molecules/CalendarSlotCell';
import { SlotCalendario } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

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
                        telefone: '77999999999',
                        setor: { id: 2, nome: 'Departamento de Ciências', sigla: 'DC' },
                    },
                },
            },
        },
    };

    function renderizar(ui: ReactElement) {
        return render(<TooltipProvider delayDuration={0}>{ui}</TooltipProvider>);
    }

    it('renderiza slot livre como botao nativo focavel, sem aria-pressed ativo', () => {
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={false} onSelectSlot={jest.fn()} />);

        const botao = screen.getByRole('button', { name: 'Segunda-feira, 07/09, 07:30 às 08:20, Livre' });

        expect(botao.tagName).toBe('BUTTON');
        expect(botao).toHaveAttribute('type', 'button');
        expect(botao).toBeEnabled();
        expect(botao).toHaveAttribute('aria-pressed', 'false');
        expect(botao).toHaveClass('focus-visible:ring-2');
    });

    it('clique sem Shift seleciona o slot com intervalo false', () => {
        const onSelectSlot = jest.fn();
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={false} onSelectSlot={onSelectSlot} />);

        fireEvent.click(screen.getByRole('button', { name: /07:30 às 08:20/ }));

        expect(onSelectSlot).toHaveBeenCalledWith(slotLivre, { intervalo: false });
    });

    it('clique com Shift envia intervalo true ao chamador', () => {
        const onSelectSlot = jest.fn();
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={false} onSelectSlot={onSelectSlot} />);

        fireEvent.click(screen.getByRole('button', { name: /07:30 às 08:20/ }), { shiftKey: true });

        expect(onSelectSlot).toHaveBeenCalledWith(slotLivre, { intervalo: true });
    });

    it('slot selecionado expõe aria-pressed=true e rotulo Selecionado', () => {
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={true} onSelectSlot={jest.fn()} />);

        const botao = screen.getByRole('button', { name: 'Segunda-feira, 07/09, 07:30 às 08:20, Selecionado' });

        expect(botao).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Selecionado')).toBeInTheDocument();
    });

    it('selecionado usa a cor primary, nunca success', () => {
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={true} onSelectSlot={jest.fn()} />);

        const botao = screen.getByRole('button', { name: /Selecionado/ });

        expect(botao).toHaveClass('bg-primary/15', 'border-primary');
        expect(botao).not.toHaveClass('bg-success-subtle');
    });

    it('hover do slot livre é neutro, sem a cor de selecionado', () => {
        renderizar(<CalendarSlotCell slot={slotLivre} isSelecionado={false} onSelectSlot={jest.fn()} />);

        const botao = screen.getByRole('button', { name: /Livre/ });

        expect(botao).toHaveClass('hover:bg-muted/60');
        expect(botao).not.toHaveClass('hover:bg-success-subtle');
    });

    it('slot passado é botão desabilitado com rótulo de encerrado e não notifica', () => {
        const onSelectSlot = jest.fn();
        const slotPassado: SlotCalendario = { ...slotLivre, isPast: true };

        renderizar(<CalendarSlotCell slot={slotPassado} isSelecionado={false} onSelectSlot={onSelectSlot} />);

        const botao = screen.getByRole('button', { name: /Horário encerrado/ });

        expect(botao).toBeDisabled();
        expect(botao).not.toHaveAttribute('aria-pressed');

        fireEvent.click(botao);

        expect(onSelectSlot).not.toHaveBeenCalled();
    });

    it('slot bloqueado é desabilitado e não notifica', () => {
        const onSelectSlot = jest.fn();

        renderizar(<CalendarSlotCell slot={{ ...slotLivre, isLocked: true }} isSelecionado={false} onSelectSlot={onSelectSlot} />);

        const botao = screen.getByRole('button', { name: /07:30 às 08:20/ });

        expect(botao).toBeDisabled();

        fireEvent.click(botao);

        expect(onSelectSlot).not.toHaveBeenCalled();
    });

    it('slot reservado nao e um botao de selecao', () => {
        renderizar(<CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelectSlot={jest.fn()} />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('slot reservado e focavel e tem rotulo com o titulo da reserva', () => {
        renderizar(<CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelectSlot={jest.fn()} />);

        const foco = screen.getByRole('group', { name: 'Segunda-feira, 07/09, 08:20 às 09:10, Reservado: Defesa de TCC' });

        expect(foco).toHaveAttribute('tabindex', '0');
        expect(foco).toHaveTextContent('Defesa de TCC');
    });

    it('foco de teclado no slot reservado abre o detalhe da reserva', () => {
        renderizar(<CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelectSlot={jest.fn()} />);

        fireEvent.focus(screen.getByRole('group', { name: /Reservado: Defesa de TCC/ }));

        expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Ver Detalhes').length).toBeGreaterThan(0);
    });

    it('toque (clique) no slot reservado abre o detalhe da reserva', () => {
        renderizar(<CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelectSlot={jest.fn()} />);

        fireEvent.click(screen.getByRole('group', { name: /Reservado: Defesa de TCC/ }));

        expect(screen.getAllByText('Maria Santos').length).toBeGreaterThan(0);
    });

    it('nao altera a selecao ao interagir com slot reservado', () => {
        const onSelectSlot = jest.fn();
        renderizar(<CalendarSlotCell slot={slotReservado} isSelecionado={false} onSelectSlot={onSelectSlot} />);

        fireEvent.click(screen.getByRole('group', { name: /Reservado: Defesa de TCC/ }));

        expect(onSelectSlot).not.toHaveBeenCalled();
    });
});
