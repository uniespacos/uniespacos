import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDadosJustificativa } from './StepDadosJustificativa';
import { ReservaFormData } from '@/types/reserva-stepper';

describe('StepDadosJustificativa', () => {
    const mockFormData: ReservaFormData = {
        titulo: '',
        descricao: '',
        publico_estimado: '',
        categoria: '',
        recorrencia: 'unica',
        data_inicial: new Date('2026-08-25'),
        data_final: new Date('2026-08-31'),
        horarios_solicitados: [],
        termo_responsabilidade: false,
    };

    it('renders input fields for title and description', () => {
        render(<StepDadosJustificativa formData={mockFormData} setFormData={jest.fn()} />);

        expect(screen.getByLabelText(/Título da Reserva \/ Evento/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Justificativa e Detalhamento das Atividades/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Público Estimado/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Categoria \/ Tipo/i)).toBeInTheDocument();
    });

    it('propagates changes through setFormData', () => {
        const handleSetFormData = jest.fn();
        render(<StepDadosJustificativa formData={mockFormData} setFormData={handleSetFormData} />);

        const titleInput = screen.getByPlaceholderText(/Ex: Aula Inaugural de Computação/i);
        fireEvent.change(titleInput, { target: { value: 'Palestra de IA' } });
        expect(handleSetFormData).toHaveBeenCalledWith('titulo', 'Palestra de IA');

        const descTextarea = screen.getByPlaceholderText(/Descreva o objetivo institucional do evento/i);
        fireEvent.change(descTextarea, { target: { value: 'Apresentação sobre agentes autônomos' } });
        expect(handleSetFormData).toHaveBeenCalledWith('descricao', 'Apresentação sobre agentes autônomos');
    });

    it('displays validation errors when passed', () => {
        render(
            <StepDadosJustificativa
                formData={mockFormData}
                setFormData={jest.fn()}
                errors={{
                    titulo: 'O título é obrigatório.',
                    descricao: 'A descrição é obrigatória.',
                }}
            />,
        );

        expect(screen.getByText('O título é obrigatório.')).toBeInTheDocument();
        expect(screen.getByText('A descrição é obrigatória.')).toBeInTheDocument();
    });
});
