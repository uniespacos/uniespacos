import { fireEvent, render, screen } from '@testing-library/react';
import { ExportarRelatorio } from './ExportarRelatorio';

describe('ExportarRelatorio', () => {
    it('renders export button and options on trigger', () => {
        const onExport = jest.fn();
        render(<ExportarRelatorio onExport={onExport} estaGerando={false} disabled={false} />);

        const trigger = screen.getByTestId('exportar-relatorio-trigger');
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent('Exportar Relatório');

        fireEvent.keyDown(trigger, { key: 'Enter' });

        expect(screen.getByText('Formato de Exportação')).toBeInTheDocument();
        expect(screen.getByText('Síntese Executiva (PDF)')).toBeInTheDocument();
        expect(screen.getByText('Planilha Completa (XLSX)')).toBeInTheDocument();
        expect(screen.getByText('Arquivo Bruto (CSV)')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Síntese Executiva (PDF)'));
        expect(onExport).toHaveBeenCalledWith('pdf');
    });

    it('displays loading state when generating', () => {
        const onExport = jest.fn();
        render(<ExportarRelatorio onExport={onExport} estaGerando={true} disabled={false} />);

        const trigger = screen.getByTestId('exportar-relatorio-trigger');
        expect(trigger).toBeDisabled();
        expect(trigger).toHaveTextContent('Gerando Relatório...');
    });

    it('disables trigger when disabled prop is true', () => {
        const onExport = jest.fn();
        render(<ExportarRelatorio onExport={onExport} estaGerando={false} disabled={true} />);

        const trigger = screen.getByTestId('exportar-relatorio-trigger');
        expect(trigger).toBeDisabled();
    });
});
