import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';
import { act, render, screen } from '@testing-library/react';
import { ReservaConflictAlert, SlotConflitavel } from './ReservaConflictAlert';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(),
    releasePrivateChannel: jest.fn(),
}));

interface EventoOcupado {
    data: string;
    horario_inicio: string;
}

type Listener = (evento: EventoOcupado) => void;

const mockAcquire = acquirePrivateChannel as jest.Mock;
const mockRelease = releasePrivateChannel as jest.Mock;

describe('ReservaConflictAlert', () => {
    let listeners: Record<string, Listener>;
    let channel: { listen: jest.Mock; stopListening: jest.Mock };

    beforeEach(() => {
        listeners = {};
        channel = {
            listen: jest.fn((nome: string, callback: Listener) => {
                listeners[nome] = callback;
            }),
            stopListening: jest.fn(),
        };
        mockAcquire.mockReturnValue(channel);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const slotSelecionado: SlotConflitavel = { id: '2026-06-03|08:20:00', data: '2026-06-03', horario_inicio: '08:20:00', horario_fim: '09:10:00' };

    it('não renderiza nada quando não há conflito', () => {
        render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotSelecionado]} />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('exibe o conflito estático com as datas informadas', () => {
        render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotSelecionado]} conflictingDates={['25/08/2026', '01/09/2026']} />);

        expect(screen.getByRole('alert')).toHaveTextContent('Já existem reservas aprovadas');
        expect(screen.getByRole('alert')).toHaveTextContent('25/08/2026, 01/09/2026');
    });

    it('exibe o conflito em tempo real e informa o slot afetado pelo id', () => {
        const onRealtimeSlotsConflict = jest.fn();

        render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotSelecionado]} onRealtimeSlotsConflict={onRealtimeSlotsConflict} />);

        act(() => {
            listeners['.HorarioOcupadoEvent']({ data: '2026-06-03', horario_inicio: '08:20:00' });
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Conflito em tempo real');
        expect(screen.getByRole('alert')).toHaveTextContent('O horário das 08:20 em 03/06/2026 acabou de ser reservado por outro usuário.');
        expect(onRealtimeSlotsConflict).toHaveBeenCalledWith(['2026-06-03|08:20:00']);
    });

    it('ignora evento que não corresponde a nenhum slot selecionado', () => {
        const onRealtimeSlotsConflict = jest.fn();

        render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotSelecionado]} onRealtimeSlotsConflict={onRealtimeSlotsConflict} />);

        act(() => {
            listeners['.HorarioOcupadoEvent']({ data: '2026-06-04', horario_inicio: '08:20:00' });
        });

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(onRealtimeSlotsConflict).not.toHaveBeenCalled();
    });

    it('compara Date pela data local, sem deslocamento para UTC', () => {
        const onRealtimeSlotsConflict = jest.fn();
        const slotComDate: SlotConflitavel = { id: 'dt', data: new Date(2026, 5, 3), horario_inicio: '08:20:00', horario_fim: '09:10:00' };

        render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotComDate]} onRealtimeSlotsConflict={onRealtimeSlotsConflict} />);

        act(() => {
            listeners['.HorarioOcupadoEvent']({ data: '2026-06-03', horario_inicio: '08:20:00' });
        });

        expect(onRealtimeSlotsConflict).toHaveBeenCalledWith(['dt']);
    });

    it('remove o alerta de conflito em tempo real quando o slot em conflito sai da seleção', () => {
        const { rerender } = render(<ReservaConflictAlert espacoId={1} selectedSlots={[slotSelecionado]} />);

        act(() => {
            listeners['.HorarioOcupadoEvent']({ data: '2026-06-03', horario_inicio: '08:20:00' });
        });

        expect(screen.getByRole('alert')).toHaveTextContent('Conflito em tempo real');

        rerender(<ReservaConflictAlert espacoId={1} selectedSlots={[]} />);

        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('libera o canal ao desmontar', () => {
        const { unmount } = render(<ReservaConflictAlert espacoId={7} selectedSlots={[slotSelecionado]} />);

        unmount();

        expect(channel.stopListening).toHaveBeenCalledWith('.HorarioOcupadoEvent');
        expect(mockRelease).toHaveBeenCalledWith('App.Models.Espaco.7');
    });
});
