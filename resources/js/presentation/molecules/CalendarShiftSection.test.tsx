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

const diasDuasSemanas: AgendaDiasSemanaType[] = [
    ...diasSemana,
    {
        data: new Date(2026, 10, 24),
        nome: 'terça-feira',
        abreviado: 'ter',
        diaMes: '24/11',
        valor: '2026-11-24',
        ehHoje: false,
    },
];

const agendaManha: Agenda = { id: 1, turno: Turno.MANHA };

function renderizar(turno: TurnoType) {
    const agenda: Agenda = { id: 1, turno };

    return render(
        <TooltipProvider>
            <CalendarShiftSection agenda={agenda} diasSemana={diasSemana} />
        </TooltipProvider>,
    );
}

describe('CalendarShiftSection', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: new Date(2026, 10, 19, 8, 0, 0) });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

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

    it('sem definirSelecaoDeVarios, o cabecalho do dia nao vira botao', () => {
        renderizar(Turno.MANHA);

        expect(screen.queryByRole('button', { name: /Marcar todos os horários livres/ })).not.toBeInTheDocument();
    });

    it('cabecalho do dia vira botao "Marcar turno" com rotulo descritivo', () => {
        render(
            <TooltipProvider>
                <CalendarShiftSection agenda={agendaManha} diasSemana={diasSemana} definirSelecaoDeVarios={jest.fn()} />
            </TooltipProvider>,
        );

        const botao = screen.getByRole('button', { name: 'Marcar todos os horários livres da manhã de segunda-feira, 23/11' });

        expect(botao).toHaveTextContent('Marcar turno');
    });

    it('clicar em Marcar turno seleciona somente os horarios selecionaveis do dia', () => {
        const definirSelecaoDeVarios = jest.fn();
        render(
            <TooltipProvider>
                <CalendarShiftSection agenda={agendaManha} diasSemana={diasSemana} definirSelecaoDeVarios={definirSelecaoDeVarios} />
            </TooltipProvider>,
        );

        fireEvent.click(screen.getByRole('button', { name: /Marcar todos os horários livres/ }));

        expect(definirSelecaoDeVarios).toHaveBeenCalledTimes(1);
        const [slots, selecionar] = definirSelecaoDeVarios.mock.calls[0] as [{ horario_inicio: string }[], boolean];
        expect(selecionar).toBe(true);
        expect(slots.map((s) => s.horario_inicio)).toHaveLength(6);
    });

    it('quando todos os livres ja estao marcados, o mesmo botao desmarca o dia', () => {
        const definirSelecaoDeVarios = jest.fn();
        render(
            <TooltipProvider>
                <CalendarShiftSection
                    agenda={agendaManha}
                    diasSemana={diasSemana}
                    isSlotSelecionado={() => true}
                    definirSelecaoDeVarios={definirSelecaoDeVarios}
                />
            </TooltipProvider>,
        );

        const botao = screen.getByRole('button', { name: /Desmarcar todos os horários selecionados da manhã de segunda-feira, 23\/11/ });
        expect(botao).toHaveTextContent('Desmarcar turno');

        fireEvent.click(botao);

        expect(definirSelecaoDeVarios).toHaveBeenCalledWith(expect.any(Array), false);
    });

    it('dia sem nenhum horario selecionavel fica com o botao desabilitado', () => {
        const diaPassado: AgendaDiasSemanaType[] = [
            {
                data: new Date(2026, 10, 1),
                nome: 'domingo',
                abreviado: 'dom',
                diaMes: '01/11',
                valor: '2026-11-01',
                ehHoje: false,
            },
        ];

        render(
            <TooltipProvider>
                <CalendarShiftSection agenda={agendaManha} diasSemana={diaPassado} definirSelecaoDeVarios={jest.fn()} />
            </TooltipProvider>,
        );

        expect(screen.getByRole('button', { name: /Marcar todos os horários livres/ })).toBeDisabled();
    });

    it('Shift+clique em um horario chama alternarSelecaoIntervalo com os slots do turno', () => {
        const alternarSelecaoIntervalo = jest.fn();
        const alternarSelecaoSlot = jest.fn();
        render(
            <TooltipProvider>
                <CalendarShiftSection
                    agenda={agendaManha}
                    diasSemana={diasDuasSemanas}
                    alternarSelecaoSlot={alternarSelecaoSlot}
                    alternarSelecaoIntervalo={alternarSelecaoIntervalo}
                />
            </TooltipProvider>,
        );

        const celulas = screen.getAllByRole('button', { name: /Segunda-feira, 23\/11, \d{2}:\d{2} às/ });
        fireEvent.click(celulas[1], { shiftKey: true });

        expect(alternarSelecaoIntervalo).toHaveBeenCalledTimes(1);
        const [slot, candidatos] = alternarSelecaoIntervalo.mock.calls[0] as [{ id: string }, { id: string }[]];
        expect(slot.id).toBe('2026-11-23|08:20:00');
        expect(candidatos).toHaveLength(12);
        expect(alternarSelecaoSlot).not.toHaveBeenCalled();
    });

    it('clique sem Shift continua usando alternarSelecaoSlot', () => {
        const alternarSelecaoIntervalo = jest.fn();
        const alternarSelecaoSlot = jest.fn();
        render(
            <TooltipProvider>
                <CalendarShiftSection
                    agenda={agendaManha}
                    diasSemana={diasSemana}
                    alternarSelecaoSlot={alternarSelecaoSlot}
                    alternarSelecaoIntervalo={alternarSelecaoIntervalo}
                />
            </TooltipProvider>,
        );

        fireEvent.click(screen.getAllByRole('button', { name: /Segunda-feira, 23\/11/ })[0]);

        expect(alternarSelecaoSlot).toHaveBeenCalledTimes(1);
        expect(alternarSelecaoIntervalo).not.toHaveBeenCalled();
    });

    it('slots livres da grade sao botoes nativos focaveis com indicador de foco e estado acessivel', () => {
        render(
            <TooltipProvider>
                <CalendarShiftSection agenda={agendaManha} diasSemana={diasSemana} alternarSelecaoSlot={jest.fn()} />
            </TooltipProvider>,
        );

        const botoesSlot = screen.getAllByRole('button');
        expect(botoesSlot).toHaveLength(6);
        botoesSlot.forEach((botao) => {
            expect(botao.tagName).toBe('BUTTON');
            expect(botao).toHaveAttribute('type', 'button');
            expect(botao).toBeEnabled();
            expect(botao).toHaveAttribute('aria-pressed', 'false');
            expect(botao).toHaveClass('focus-visible:ring-2');
        });
    });
});
