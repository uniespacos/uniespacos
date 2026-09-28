import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepHorariosRecorrencia } from './StepHorariosRecorrencia';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(() => ({
        listen: jest.fn(),
        stopListening: jest.fn(),
    })),
    releasePrivateChannel: jest.fn(),
}));

describe('StepHorariosRecorrencia', () => {
    let mockEspaco: Espaco;
    let mockFormData: ReservaFormData;
    let mockSlots: SlotCalendario[];

    beforeEach(() => {
        mockEspaco = {
            id: 1,
            nome: 'Auditório',
            capacidade_pessoas: 100,
            agendas: [],
            descricao: '',
            imagens: [],
            main_image_index: null,
        };

        mockSlots = [
            {
                id: '2026-08-25|08:00',
                data: new Date('2026-08-25T00:00:00'),
                horario_inicio: '08:00:00',
                horario_fim: '09:00:00',
                status: 'selecionado',
                agenda_id: 1,
            },
        ];

        mockFormData = {
            titulo: 'Evento',
            descricao: 'Desc',
            recorrencia: 'unica',
            data_inicial: new Date('2026-08-25T00:00:00'),
            data_final: new Date('2026-08-31T00:00:00'),
            horarios_solicitados: [],
            termo_responsabilidade: false,
        };
    });

    it('renders recurrence options and slot list grouped by day', () => {
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
            />,
        );

        expect(screen.getByText(/Padrão de Recorrência/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Apenas esta semana/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/próximos 15 dias/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('08:00 - 09:00')).toBeInTheDocument();
    });

    it('changes recurrence pattern when clicking radio options', () => {
        const handleSetFormData = jest.fn();
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={handleSetFormData}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
            />,
        );

        const rec15Dias = screen.getByText('Próximos 15 dias');
        fireEvent.click(rec15Dias);
        expect(handleSetFormData).toHaveBeenCalledWith('recorrencia', '15dias');
    });

    it('renders edit_scope radio cards when isEditMode is true', () => {
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={{ ...mockFormData, edit_scope: 'recurring' }}
                setFormData={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
                isEditMode={true}
            />,
        );

        expect(screen.getByText(/Escopo da Edição/i)).toBeInTheDocument();
        expect(screen.getByText(/Todas as ocorrências/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Apenas esta semana/i).length).toBe(2);
    });
});
