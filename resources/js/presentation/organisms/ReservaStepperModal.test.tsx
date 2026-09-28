import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReservaStepperModal } from './ReservaStepperModal';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(() => ({
        listen: jest.fn(),
        stopListening: jest.fn(),
    })),
    releasePrivateChannel: jest.fn(),
}));

describe('ReservaStepperModal', () => {
    let mockEspaco: Espaco;
    let mockFormData: ReservaFormData;
    let mockSlots: SlotCalendario[];

    beforeEach(() => {
        mockEspaco = {
            id: 1,
            nome: 'Auditório Central',
            capacidade_pessoas: 200,
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
            titulo: 'Seminário de Tecnologia',
            descricao: 'Evento institucional com palestras sobre inovação.',
            recorrencia: 'unica',
            data_inicial: new Date('2026-08-25T00:00:00'),
            data_final: new Date('2026-08-31T00:00:00'),
            horarios_solicitados: [
                {
                    data: '2026-08-25',
                    horario_inicio: '08:00:00',
                    horario_fim: '09:00:00',
                    agenda_id: 1,
                },
            ],
            termo_responsabilidade: true,
        };
    });

    it('renders the modal when isOpen is true with step 1 visible', () => {
        render(
            <ReservaStepperModal
                isOpen={true}
                onOpenChange={jest.fn()}
                onSubmit={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
                isSubmitting={false}
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
            />,
        );

        expect(screen.getByText(/Solicitar Reserva — Auditório Central/i)).toBeInTheDocument();
        expect(screen.getByText(/Padrão de Recorrência/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /avançar/i })).toBeInTheDocument();
    });

    it('advances through steps on button click', () => {
        render(
            <ReservaStepperModal
                isOpen={true}
                onOpenChange={jest.fn()}
                onSubmit={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
                isSubmitting={false}
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
            />,
        );

        // Passo 1 -> Avançar para Passo 2
        const avancarBtn = screen.getByRole('button', { name: /avançar/i });
        fireEvent.click(avancarBtn);

        expect(screen.getByLabelText(/Título da Reserva \/ Evento/i)).toBeInTheDocument();

        // Passo 2 -> Avançar para Passo 3
        const avancarBtn2 = screen.getByRole('button', { name: /avançar/i });
        fireEvent.click(avancarBtn2);

        expect(screen.getByText(/Termo de Compromisso e Responsabilidade/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeInTheDocument();
    });

    it('submits on the final step when clicking Confirmar Reserva', () => {
        const handleSubmit = jest.fn((e: React.SyntheticEvent) => {
            e.preventDefault();
        });

        render(
            <ReservaStepperModal
                isOpen={true}
                onOpenChange={jest.fn()}
                onSubmit={handleSubmit}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
                isSubmitting={false}
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
            />,
        );

        // Avançar para o passo 2
        fireEvent.click(screen.getByRole('button', { name: /avançar/i }));
        // Avançar para o passo 3
        fireEvent.click(screen.getByRole('button', { name: /avançar/i }));

        const submitBtn = screen.getByRole('button', { name: /confirmar reserva/i });
        fireEvent.click(submitBtn);

        expect(handleSubmit).toHaveBeenCalled();
    });
});
