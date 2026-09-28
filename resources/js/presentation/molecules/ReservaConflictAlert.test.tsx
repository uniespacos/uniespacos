import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ReservaConflictAlert } from './ReservaConflictAlert';
import { acquirePrivateChannel, releasePrivateChannel } from '@/lib/echo-channel-registry';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(),
    releasePrivateChannel: jest.fn(),
}));

describe('ReservaConflictAlert', () => {
    let mockChannel: {
        listen: jest.Mock;
        stopListening: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockChannel = {
            listen: jest.fn(),
            stopListening: jest.fn(),
        };
        (acquirePrivateChannel as jest.Mock).mockReturnValue(mockChannel);
    });

    it('returns null when there are no conflicts and no events', () => {
        const { container } = render(
            <ReservaConflictAlert espacoId={1} selectedSlots={[{ data: '2026-08-25', horario_inicio: '08:00', horario_fim: '09:00' }]} />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('displays static conflicts when conflictingDates are passed', () => {
        render(
            <ReservaConflictAlert
                espacoId={1}
                selectedSlots={[{ data: '2026-08-25', horario_inicio: '08:00', horario_fim: '09:00' }]}
                conflictingDates={['25/08/2026', '26/08/2026']}
            />,
        );

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Conflito de Horários Existente/i)).toBeInTheDocument();
        expect(screen.getByText(/25\/08\/2026, 26\/08\/2026/i)).toBeInTheDocument();
    });

    it('listens to Reverb HorarioOcupadoEvent and alerts when matching slot is broadcast', () => {
        const handleConflict = jest.fn();
        let capturedCallback: ((event: { data: string; horario_inicio: string }) => void) | undefined;
        mockChannel.listen.mockImplementation((_eventName: string, cb: (event: { data: string; horario_inicio: string }) => void) => {
            capturedCallback = cb;
        });

        render(
            <ReservaConflictAlert
                espacoId={10}
                selectedSlots={[{ data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00' }]}
                onConflictDetected={handleConflict}
            />,
        );

        expect(acquirePrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.10');
        expect(mockChannel.listen).toHaveBeenCalledWith('.HorarioOcupadoEvent', expect.any(Function));

        act(() => {
            capturedCallback?.({
                data: '2026-08-25',
                horario_inicio: '08:00:00',
            });
        });

        expect(screen.getByText(/Conflito em Tempo Real/i)).toBeInTheDocument();
        expect(screen.getByText(/O horário das 08:00 em 2026-08-25 acabou de ser reservado/i)).toBeInTheDocument();
        expect(handleConflict).toHaveBeenCalledWith(true);
    });

    it('releases channel on unmount', () => {
        const { unmount } = render(
            <ReservaConflictAlert espacoId={10} selectedSlots={[{ data: '2026-08-25', horario_inicio: '08:00', horario_fim: '09:00' }]} />,
        );

        unmount();

        expect(mockChannel.stopListening).toHaveBeenCalledWith('.HorarioOcupadoEvent');
        expect(releasePrivateChannel).toHaveBeenCalledWith('App.Models.Espaco.10');
    });
});
