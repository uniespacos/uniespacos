import { TooltipProvider } from '@/components/ui/tooltip';
import { Turno, type TurnoType } from '@/contracts/turnos.contract';
import type { Agenda, AgendaDiasSemanaType } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import CalendarShiftSection from './CalendarShiftSection';

const diasSemana: AgendaDiasSemanaType[] = [
    {
        data: new Date(2026, 10, 23),
        nome: 'segunda-feira',
        abreviado: 'seg',
        diaMes: '23/11',
        valor: '2026-11-23',
        ehHoje: false,
    },
];

function renderizar(turno: TurnoType) {
    const agenda: Agenda = { id: 1, turno };

    return render(
        <TooltipProvider>
            <CalendarShiftSection agenda={agenda} diasSemana={diasSemana} />
        </TooltipProvider>,
    );
}

describe('CalendarShiftSection', () => {
    const casos: [TurnoType, string][] = [
        [Turno.MANHA, 'Manhã'],
        [Turno.TARDE, 'Tarde'],
        [Turno.NOITE, 'Noite'],
    ];

    it.each(casos)('cabeçalho do turno "%s" aparece traduzido como "%s" e nunca com o valor cru', (turno, rotulo) => {
        renderizar(turno);

        expect(screen.getByText(rotulo)).toBeInTheDocument();
        expect(screen.queryByText(turno)).not.toBeInTheDocument();
    });

    it('permite selecionar slot na grade via teclado (Enter e Espaco)', () => {
        const agenda: Agenda = { id: 1, turno: Turno.MANHA };
        const alternarSelecaoSlot = jest.fn();

        render(
            <TooltipProvider>
                <CalendarShiftSection agenda={agenda} diasSemana={diasSemana} alternarSelecaoSlot={alternarSelecaoSlot} />
            </TooltipProvider>,
        );

        const botoesSlot = screen.getAllByRole('button');
        expect(botoesSlot.length).toBeGreaterThan(0);

        fireEvent.keyDown(botoesSlot[0], { key: 'Enter' });
        fireEvent.keyDown(botoesSlot[0], { key: ' ' });

        expect(alternarSelecaoSlot).toHaveBeenCalledTimes(2);
    });
});
