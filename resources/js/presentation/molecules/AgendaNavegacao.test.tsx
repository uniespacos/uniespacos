import { AgendaNavegacao } from '@/presentation/molecules/AgendaNavegacao';
import { fireEvent, render, screen } from '@testing-library/react';

describe('AgendaNavegacao', () => {
    const dataSegunda = new Date('2026-09-07T12:00:00');

    it('renderiza o intervalo de datas da semana atual', () => {
        render(<AgendaNavegacao semanaAtual={dataSegunda} />);

        // Segunda 07/09 a Domingo 13/09
        expect(screen.getAllByText('07/09 - 13/09')[0]).toBeInTheDocument();
    });

    it('renderiza o formato com ano na variante compact', () => {
        render(<AgendaNavegacao semanaAtual={dataSegunda} variant="compact" />);

        expect(screen.getByText('07/09 - 13/09/2026')).toBeInTheDocument();
    });

    it('dispara onAnterior e onProxima ao clicar nos botões', () => {
        const onAnterior = jest.fn();
        const onProxima = jest.fn();

        render(<AgendaNavegacao semanaAtual={dataSegunda} onAnterior={onAnterior} onProxima={onProxima} />);

        fireEvent.click(screen.getByRole('button', { name: /semana anterior/i }));
        expect(onAnterior).toHaveBeenCalledTimes(1);

        const proximaButtons = screen.getAllByRole('button', { name: /próxima semana/i });
        fireEvent.click(proximaButtons[0]);
        expect(onProxima).toHaveBeenCalledTimes(1);
    });

    it('dispara onReset ao clicar no botão Hoje', () => {
        const onReset = jest.fn();

        render(<AgendaNavegacao semanaAtual={dataSegunda} onReset={onReset} />);

        fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('desabilita botões quando desabilitarAnterior ou desabilitarProxima são true', () => {
        render(<AgendaNavegacao semanaAtual={dataSegunda} desabilitarAnterior={true} desabilitarProxima={true} />);

        expect(screen.getByRole('button', { name: /semana anterior/i })).toBeDisabled();
        screen.getAllByRole('button', { name: /próxima semana/i }).forEach((btn) => {
            expect(btn).toBeDisabled();
        });
    });

    it('desabilita botões e exibe spinner quando isLoading é true', () => {
        render(<AgendaNavegacao semanaAtual={dataSegunda} isLoading={true} />);

        expect(screen.getByRole('button', { name: /semana anterior/i })).toBeDisabled();
        screen.getAllByRole('button', { name: /próxima semana/i }).forEach((btn) => {
            expect(btn).toBeDisabled();
        });
    });

    it('suporta os aliases de callback onSemanaAnterior, onProximaSemana e onHoje', () => {
        const onSemanaAnterior = jest.fn();
        const onProximaSemana = jest.fn();
        const onHoje = jest.fn();

        render(
            <AgendaNavegacao dataReferencia={dataSegunda} onSemanaAnterior={onSemanaAnterior} onProximaSemana={onProximaSemana} onHoje={onHoje} />,
        );

        fireEvent.click(screen.getByRole('button', { name: /semana anterior/i }));
        expect(onSemanaAnterior).toHaveBeenCalledTimes(1);

        const proximaButtons = screen.getAllByRole('button', { name: /próxima semana/i });
        fireEvent.click(proximaButtons[0]);
        expect(onProximaSemana).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
        expect(onHoje).toHaveBeenCalledTimes(1);
    });
});
