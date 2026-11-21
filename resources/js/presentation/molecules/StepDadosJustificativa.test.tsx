import { ReservaFormData } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepDadosJustificativa } from './StepDadosJustificativa';

function criarFormData(overrides: Partial<ReservaFormData> = {}): ReservaFormData {
    return {
        titulo: '',
        descricao: '',
        recorrencia: 'unica',
        horarios_solicitados: [],
        ...overrides,
    };
}

describe('StepDadosJustificativa', () => {
    it('trata a justificativa como opcional e o título como obrigatório', () => {
        render(<StepDadosJustificativa formData={criarFormData()} setFormData={jest.fn()} />);

        expect(screen.getByLabelText('Detalhes para o gestor (opcional)')).toBeInTheDocument();
        expect(screen.getByLabelText(/Título da reserva ou evento/)).toHaveAttribute('aria-required', 'true');
    });

    it('limita a justificativa a 2000 caracteres e mostra o contador', () => {
        render(<StepDadosJustificativa formData={criarFormData({ descricao: 'abc' })} setFormData={jest.fn()} />);

        expect(screen.getByLabelText('Detalhes para o gestor (opcional)')).toHaveAttribute('maxLength', '2000');
        expect(screen.getByText('3/2000')).toBeInTheDocument();
    });

    it('propaga a digitação do título e da justificativa', () => {
        const setFormData = jest.fn();

        render(<StepDadosJustificativa formData={criarFormData()} setFormData={setFormData} />);

        fireEvent.change(screen.getByLabelText(/Título da reserva ou evento/), { target: { value: 'Defesa' } });
        expect(setFormData).toHaveBeenCalledWith('titulo', 'Defesa');

        fireEvent.change(screen.getByLabelText('Detalhes para o gestor (opcional)'), { target: { value: 'Projetor' } });
        expect(setFormData).toHaveBeenCalledWith('descricao', 'Projetor');
    });

    it('propaga o valor bruto digitado no público estimado', () => {
        const setFormData = jest.fn();

        render(<StepDadosJustificativa formData={criarFormData()} setFormData={setFormData} />);

        fireEvent.change(screen.getByLabelText('Público estimado (opcional)'), { target: { value: '40' } });
        expect(setFormData).toHaveBeenLastCalledWith('publico_estimado', '40');

        fireEvent.change(screen.getByLabelText('Público estimado (opcional)'), { target: { value: '1.5' } });
        expect(setFormData).toHaveBeenLastCalledWith('publico_estimado', '1.5');
    });

    it('limpar o público estimado envia valor vazio', () => {
        const setFormData = jest.fn();

        render(<StepDadosJustificativa formData={criarFormData({ publico_estimado: 40 })} setFormData={setFormData} />);

        fireEvent.change(screen.getByLabelText('Público estimado (opcional)'), { target: { value: '' } });

        expect(setFormData).toHaveBeenLastCalledWith('publico_estimado', '');
    });

    it('mostra aviso não bloqueante quando o público passa da capacidade', () => {
        render(<StepDadosJustificativa formData={criarFormData({ publico_estimado: 45 })} setFormData={jest.fn()} capacidade={30} />);

        expect(screen.getByRole('status')).toHaveTextContent('Acima da capacidade de 30 pessoas deste espaço.');
        expect(screen.getByLabelText('Público estimado (opcional)')).toBeEnabled();
    });

    it('não mostra aviso quando o público cabe na capacidade', () => {
        render(<StepDadosJustificativa formData={criarFormData({ publico_estimado: 30 })} setFormData={jest.fn()} capacidade={30} />);

        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('oferece sugestões de categoria por chips clicáveis de 1 toque e permite desmarcar', () => {
        const setFormData = jest.fn();
        const { rerender } = render(<StepDadosJustificativa formData={criarFormData()} setFormData={setFormData} />);

        const esperadas = ['Aula', 'Palestra', 'Reunião', 'Defesa', 'Evento', 'Extensão'];
        for (const sugestao of esperadas) {
            expect(screen.getByRole('button', { name: sugestao })).toBeInTheDocument();
        }

        fireEvent.click(screen.getByRole('button', { name: 'Palestra' }));
        expect(setFormData).toHaveBeenCalledWith('categoria', 'Palestra');

        rerender(<StepDadosJustificativa formData={criarFormData({ categoria: 'Palestra' })} setFormData={setFormData} />);
        expect(screen.getByRole('button', { name: 'Palestra' })).toHaveAttribute('aria-pressed', 'true');

        fireEvent.click(screen.getByRole('button', { name: 'Palestra' }));
        expect(setFormData).toHaveBeenLastCalledWith('categoria', '');
    });

    it('permite expandir e recolher o campo opcional de observação no mobile', () => {
        render(<StepDadosJustificativa formData={criarFormData()} setFormData={jest.fn()} />);

        const botaoExpandir = screen.getByRole('button', { name: /Adicionar observação para o gestor/i });
        expect(botaoExpandir).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(botaoExpandir);
        expect(screen.getByRole('button', { name: /Ocultar observação/i })).toHaveAttribute('aria-expanded', 'true');
    });

    it('exibe os erros inline recebidos', () => {
        render(
            <StepDadosJustificativa
                formData={criarFormData()}
                setFormData={jest.fn()}
                errors={{
                    titulo: 'O título da reserva é obrigatório.',
                    descricao: 'A descrição não pode exceder 2000 caracteres.',
                    publico_estimado: 'Informe um número inteiro entre 1 e 5000.',
                }}
            />,
        );

        expect(screen.getByText('O título da reserva é obrigatório.')).toBeInTheDocument();
        expect(screen.getByText('A descrição não pode exceder 2000 caracteres.')).toBeInTheDocument();
        expect(screen.getByText('Informe um número inteiro entre 1 e 5000.')).toBeInTheDocument();
        expect(screen.getByLabelText(/Título da reserva ou evento/)).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Detalhes para o gestor (opcional)')).toHaveAttribute('aria-invalid', 'true');
        expect(screen.getByLabelText('Público estimado (opcional)')).toHaveAttribute('aria-invalid', 'true');
    });
});
