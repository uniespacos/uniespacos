import { CalendarSlotHoverCard, CalendarSlotHoverCardData } from '@/presentation/molecules/CalendarSlotHoverCard';
import { render, screen } from '@testing-library/react';

describe('CalendarSlotHoverCard', () => {
    const defaultData: CalendarSlotHoverCardData = {
        reservaId: 42,
        titulo: 'Reunião de Colegiado',
        solicitanteNome: 'Carlos Drummond',
        solicitanteSetor: 'Departamento de Letras',
        horarioInicio: '08:00',
        horarioFim: '10:00',
        situacao: 'deferida',
        justificativa: 'Reunião ordinária semestral',
    };

    it('renderiza os dados principais do solicitante e da reserva', () => {
        render(<CalendarSlotHoverCard data={defaultData} />);

        expect(screen.getByText('Carlos Drummond')).toBeInTheDocument();
        expect(screen.getByText('Departamento de Letras')).toBeInTheDocument();
        expect(screen.getByText('Reunião de Colegiado')).toBeInTheDocument();
        expect(screen.getByText('08:00 às 10:00')).toBeInTheDocument();
        expect(screen.getByText('CD')).toBeInTheDocument();
        expect(screen.getByText('Deferida')).toBeInTheDocument();
        expect(screen.getByText('"Reunião ordinária semestral"')).toBeInTheDocument();
    });

    it('renderiza link de detalhes quando canViewDetails é true e reservaId existe', () => {
        render(<CalendarSlotHoverCard data={defaultData} canViewDetails={true} />);

        const link = screen.getByRole('link', { name: /ver detalhes/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/reservas/42');
    });

    it('oculta o link de detalhes quando canViewDetails é false', () => {
        render(<CalendarSlotHoverCard data={defaultData} canViewDetails={false} />);

        expect(screen.queryByRole('link', { name: /ver detalhes/i })).not.toBeInTheDocument();
    });

    it('oculta o link de detalhes quando reservaId não é informado', () => {
        const semId: CalendarSlotHoverCardData = {
            ...defaultData,
            reservaId: undefined,
        };

        render(<CalendarSlotHoverCard data={semId} />);

        expect(screen.queryByRole('link', { name: /ver detalhes/i })).not.toBeInTheDocument();
    });

    it('não quebra quando setor ou justificativa não são informados', () => {
        const dadosMinimos: CalendarSlotHoverCardData = {
            titulo: 'Palestra',
            solicitanteNome: 'Ana',
            horarioInicio: '14:00',
            horarioFim: '16:00',
            situacao: 'em_analise',
        };

        render(<CalendarSlotHoverCard data={dadosMinimos} />);

        expect(screen.getByText('Ana')).toBeInTheDocument();
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('Em Análise')).toBeInTheDocument();
        expect(screen.queryByText(/Departamento/)).not.toBeInTheDocument();
    });
});
