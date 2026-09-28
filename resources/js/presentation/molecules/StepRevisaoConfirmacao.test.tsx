import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepRevisaoConfirmacao } from './StepRevisaoConfirmacao';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';

describe('StepRevisaoConfirmacao', () => {
    const mockEspaco: Espaco = {
        id: 1,
        nome: 'Auditório Principal',
        capacidade_pessoas: 150,
        descricao: '',
        agendas: [],
        imagens: [],
        main_image_index: null,
    };

    const mockFormData: ReservaFormData = {
        titulo: 'Workshop de React',
        descricao: 'Treinamento para a equipe de desenvolvimento.',
        publico_estimado: 50,
        categoria: 'Treinamento',
        recorrencia: 'unica',
        data_inicial: new Date('2026-08-25T00:00:00'),
        data_final: new Date('2026-08-31T00:00:00'),
        horarios_solicitados: [],
        termo_responsabilidade: false,
    };

    const mockSlots: SlotCalendario[] = [
        {
            id: '2026-08-25|08:00',
            data: new Date('2026-08-25T00:00:00'),
            horario_inicio: '08:00:00',
            horario_fim: '09:00:00',
            status: 'selecionado',
        },
    ];

    it('renders space summary and submitted fields', () => {
        render(<StepRevisaoConfirmacao espaco={mockEspaco} formData={mockFormData} setFormData={jest.fn()} slotsSelecao={mockSlots} />);

        expect(screen.getByText('Auditório Principal')).toBeInTheDocument();
        expect(screen.getByText(/150 pessoas/i)).toBeInTheDocument();
        expect(screen.getByText('Workshop de React')).toBeInTheDocument();
        expect(screen.getByText(/Treinamento para a equipe de desenvolvimento/i)).toBeInTheDocument();
        expect(screen.getByText(/^50 pessoas$/i)).toBeInTheDocument();
    });

    it('toggles responsibility checkbox via setFormData', () => {
        const handleSetFormData = jest.fn();
        render(<StepRevisaoConfirmacao espaco={mockEspaco} formData={mockFormData} setFormData={handleSetFormData} slotsSelecao={mockSlots} />);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);
        expect(handleSetFormData).toHaveBeenCalledWith('termo_responsabilidade', true);
    });
});
