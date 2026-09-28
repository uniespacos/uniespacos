import { Agenda, AgendaDiasSemanaType, Horario } from '@/types';
import { fireEvent, render, screen, within } from '@testing-library/react';
import CalendarDiaMobile from './CalendarDiaMobile';

describe('CalendarDiaMobile', () => {
    const diasSemana: AgendaDiasSemanaType[] = [
        { data: new Date('2026-09-07T12:00:00'), nome: 'Segunda-feira', abreviado: 'seg.', diaMes: '07/09', valor: 'seg', ehHoje: true },
        { data: new Date('2026-09-08T12:00:00'), nome: 'Terça-feira', abreviado: 'ter.', diaMes: '08/09', valor: 'ter', ehHoje: false },
    ];

    const gestor = { id: 3, name: 'Gestor' } as never;

    function agenda(turno: Agenda['turno'], horarios: Horario[] = []): Agenda {
        return { id: turno === 'manha' ? 1 : turno === 'tarde' ? 2 : 3, turno, user: gestor, horarios };
    }

    function horarioDeferido(data: string, inicio: string): Horario {
        return {
            id: 10,
            data,
            horario_inicio: inicio,
            horario_fim: '08:20:00',
            situacao: 'deferida',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            reserva: { id: 99, titulo: 'Aula de Cálculo', user: { id: 5, name: 'Maria' } } as never,
        };
    }

    const props = {
        diasSemana,
        agendas: [agenda('tarde'), agenda('manha')],
        isSlotSelecionado: () => false,
        alternarSelecaoSlot: jest.fn(),
    };

    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-09-07T06:00:00'));
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renderiza os turnos na ordem canonica, nao na ordem recebida', () => {
        render(<CalendarDiaMobile {...props} />);

        const titulos = screen.getAllByText(/^(Manhã|Tarde|Noite)$/).map((el) => el.textContent);

        expect(titulos).toEqual(['Manhã', 'Tarde']);
    });

    it('abre no dia de hoje', () => {
        render(<CalendarDiaMobile {...props} />);

        expect(screen.getByRole('tab', { name: /segunda-feira/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('expoe o dia por extenso no nome acessivel da aba', () => {
        render(<CalendarDiaMobile {...props} />);

        expect(screen.getByRole('tab', { name: 'Segunda-feira, dia 07/09' })).toBeInTheDocument();
    });

    it('trocar de dia troca os slots exibidos', () => {
        const comReservaNaSegunda = [agenda('manha', [horarioDeferido('2026-09-07', '07:30:00')])];

        render(<CalendarDiaMobile {...props} agendas={comReservaNaSegunda} />);

        expect(screen.getByText('Aula de Cálculo')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: /terça-feira/i }));

        expect(screen.queryByText('Aula de Cálculo')).not.toBeInTheDocument();
    });

    it('clicar num slot livre notifica a selecao', () => {
        render(<CalendarDiaMobile {...props} agendas={[agenda('manha')]} />);

        fireEvent.click(screen.getByRole('button', { name: /07:30 - 08:20/ }));

        expect(props.alternarSelecaoSlot).toHaveBeenCalledTimes(1);
    });

    it('slot reservado fica desabilitado e nao notifica', () => {
        const comReserva = [agenda('manha', [horarioDeferido('2026-09-07', '07:30:00')])];

        render(<CalendarDiaMobile {...props} agendas={comReserva} />);

        const linha = screen.getByRole('button', { name: /07:30 - 08:20/ });

        expect(linha).toBeDisabled();

        fireEvent.click(linha);

        expect(props.alternarSelecaoSlot).not.toHaveBeenCalled();
    });

    it('mostra Selecionado quando o slot esta na selecao', () => {
        render(<CalendarDiaMobile {...props} agendas={[agenda('manha')]} isSlotSelecionado={() => true} />);

        const linha = screen.getByRole('button', { name: /07:30 - 08:20/ });

        expect(within(linha).getByText('Selecionado')).toBeInTheDocument();
    });

    it('ignora agendas sem gestor', () => {
        const semGestor = [{ id: 9, turno: 'noite', horarios: [] } as Agenda];

        render(<CalendarDiaMobile {...props} agendas={semGestor} />);

        expect(screen.getByText(/Nenhum turno disponível/)).toBeInTheDocument();
    });

    it('exibe agendas sem gestor quando exigirGestor={false}', () => {
        const semGestor: Agenda = { id: 9, turno: 'noite', horarios: [] };

        render(<CalendarDiaMobile {...props} agendas={[semGestor]} exigirGestor={false} />);

        expect(screen.getByText('Noite')).toBeInTheDocument();
        expect(screen.queryByText(/Nenhum turno disponível/)).not.toBeInTheDocument();
    });

    it('nao quebra quando a semana vem vazia', () => {
        const { container } = render(<CalendarDiaMobile {...props} diasSemana={[]} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('usa alvos de toque confortaveis', () => {
        render(<CalendarDiaMobile {...props} agendas={[agenda('manha')]} />);

        expect(screen.getByRole('tab', { name: /segunda-feira/i })).toHaveClass('min-h-[52px]');
        expect(screen.getByRole('button', { name: /07:30 - 08:20/ })).toHaveClass('min-h-[52px]');
    });

    it('exibe as faixas de horario do turno selecionado', () => {
        render(<CalendarDiaMobile {...props} agendas={[agenda('manha')]} />);

        expect(screen.getAllByRole('button').filter((b) => /\d{2}:\d{2} - \d{2}:\d{2}/.test(b.textContent ?? ''))).toHaveLength(6);
    });

    it('mostra indicador dot no dia que possui slot na reserva', () => {
        const slotsDaReserva = [
            {
                id: '2026-09-08|07:30:00',
                status: 'deferida' as const,
                data: new Date('2026-09-08T07:30:00'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        render(
            <CalendarDiaMobile
                {...props}
                agendas={[agenda('manha')]}
                slotsDaReserva={slotsDaReserva}
            />,
        );

        const abaTerc = screen.getByRole('tab', { name: /terça-feira/i });
        const dots = within(abaTerc).queryAllByText('');
        expect(dots.some((d) => d.className.includes('rounded-full'))).toBe(true);
    });

    it('nao mostra indicador dot em dia sem slot da reserva', () => {
        const slotsDaReserva = [
            {
                id: '2026-09-08|07:30:00',
                status: 'deferida' as const,
                data: new Date('2026-09-08T07:30:00'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        render(
            <CalendarDiaMobile
                {...props}
                agendas={[agenda('manha')]}
                slotsDaReserva={slotsDaReserva}
            />,
        );

        const abaSeg = screen.getByRole('tab', { name: /segunda-feira/i });
        const dotsEmSeg = within(abaSeg).queryAllByRole('status').filter((d) => d.className.includes('rounded-full'));
        expect(dotsEmSeg).toHaveLength(0);
    });

    it('aba ativa usa ring-2 ring-muted-foreground e bg-muted-foreground/10, nao bg-muted-foreground solido', () => {
        render(<CalendarDiaMobile {...props} agendas={[agenda('manha')]} />);

        const abaSeg = screen.getByRole('tab', { name: /segunda-feira/i });
        const circleAtivo = within(abaSeg).getByText(/^07$/);

        expect(circleAtivo).toHaveClass('ring-2');
        expect(circleAtivo).toHaveClass('ring-muted-foreground');
        expect(circleAtivo).toHaveClass('bg-muted-foreground/10');
        expect(circleAtivo).not.toHaveClass('bg-muted-foreground');
    });

    it('indicador dot usa cor do status dominante do dia', () => {
        const slotsDaReserva = [
            {
                id: '2026-09-08|07:30:00',
                status: 'indeferida' as const,
                data: new Date('2026-09-08T07:30:00'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        render(
            <CalendarDiaMobile
                {...props}
                agendas={[agenda('manha')]}
                slotsDaReserva={slotsDaReserva}
            />,
        );

        const abaTerc = screen.getByRole('tab', { name: /terça-feira/i });
        const spans = abaTerc.querySelectorAll('span');
        const indicador = Array.from(spans).find(
            (s) => s.className.includes('rounded-full') && s.className.includes('bottom-1'),
        );

        expect(indicador).toBeTruthy();
        expect(indicador).toHaveClass('bg-destructive');
    });

    it('modo primeiroComReserva: aba ativa eh o primeiro dia da semana com slot da reserva', () => {
        const slotsDaReserva = [
            {
                id: '2026-09-09|07:30:00',
                status: 'deferida' as const,
                data: new Date('2026-09-09T07:30:00'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        const diasComQuarta: AgendaDiasSemanaType[] = [
            { data: new Date('2026-09-07T12:00:00'), nome: 'Segunda-feira', abreviado: 'seg.', diaMes: '07/09', valor: '2026-09-07', ehHoje: false },
            { data: new Date('2026-09-08T12:00:00'), nome: 'Terça-feira', abreviado: 'ter.', diaMes: '08/09', valor: '2026-09-08', ehHoje: false },
            { data: new Date('2026-09-09T12:00:00'), nome: 'Quarta-feira', abreviado: 'qua.', diaMes: '09/09', valor: '2026-09-09', ehHoje: false },
        ];

        render(
            <CalendarDiaMobile
                {...props}
                diasSemana={diasComQuarta}
                agendas={[agenda('manha')]}
                slotsDaReserva={slotsDaReserva}
                modoSelecaoInicial="primeiroComReserva"
            />,
        );

        expect(screen.getByRole('tab', { name: /quarta-feira/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: /segunda-feira/i })).toHaveAttribute('aria-selected', 'false');
    });

    it('modo primeiroComReserva: fallback para hoje quando nao ha slots na semana', () => {
        const slotsDaReserva = [
            {
                id: '2026-09-15|07:30:00',
                status: 'deferida' as const,
                data: new Date('2026-09-15T07:30:00'),
                horario_inicio: '07:30:00',
                horario_fim: '08:20:00',
            },
        ];

        render(
            <CalendarDiaMobile
                {...props}
                agendas={[agenda('manha')]}
                slotsDaReserva={slotsDaReserva}
                modoSelecaoInicial="primeiroComReserva"
            />,
        );

        expect(screen.getByRole('tab', { name: /segunda-feira/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('modo hoje: comportamento padrão preservado mesmo com modoSelecaoInicial explícito', () => {
        render(
            <CalendarDiaMobile
                {...props}
                agendas={[agenda('manha')]}
                modoSelecaoInicial="hoje"
            />,
        );

        expect(screen.getByRole('tab', { name: /segunda-feira/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('regressao: trocar de semana via key recomuta o indice ativo', () => {
        const semana1: AgendaDiasSemanaType[] = [
            { data: new Date('2026-09-07T12:00:00'), nome: 'Segunda-feira', abreviado: 'seg.', diaMes: '07/09', valor: '2026-09-07', ehHoje: true },
            { data: new Date('2026-09-08T12:00:00'), nome: 'Terça-feira', abreviado: 'ter.', diaMes: '08/09', valor: '2026-09-08', ehHoje: false },
        ];

        const semana2: AgendaDiasSemanaType[] = [
            { data: new Date('2026-09-14T12:00:00'), nome: 'Segunda-feira', abreviado: 'seg.', diaMes: '14/09', valor: '2026-09-14', ehHoje: false },
            { data: new Date('2026-09-15T12:00:00'), nome: 'Terça-feira', abreviado: 'ter.', diaMes: '15/09', valor: '2026-09-15', ehHoje: false },
        ];

        const { rerender } = render(
            <CalendarDiaMobile
                key={semana1[0]?.valor}
                {...props}
                diasSemana={semana1}
                agendas={[agenda('manha')]}
            />,
        );

        expect(screen.getByRole('tab', { name: /segunda-feira, dia 07\/09/i })).toHaveAttribute('aria-selected', 'true');

        rerender(
            <CalendarDiaMobile
                key={semana2[0]?.valor}
                {...props}
                diasSemana={semana2}
                agendas={[agenda('manha')]}
            />,
        );

        expect(screen.getByRole('tab', { name: /segunda-feira, dia 14\/09/i })).toHaveAttribute('aria-selected', 'true');
        expect(screen.queryByRole('tab', { name: /segunda-feira, dia 07\/09/i })).not.toBeInTheDocument();
    });
});
