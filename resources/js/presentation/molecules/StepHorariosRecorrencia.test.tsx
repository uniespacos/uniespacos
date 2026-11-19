import { SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepHorariosRecorrencia } from './StepHorariosRecorrencia';

function criarFormData(overrides: Partial<ReservaFormData> = {}): ReservaFormData {
    return {
        titulo: 'Aula',
        descricao: '',
        recorrencia: 'unica',
        data_inicial: new Date(2026, 10, 20),
        data_final: new Date(2026, 10, 20),
        horarios_solicitados: [],
        ...overrides,
    };
}

function criarSlot(id: string, data: Date, inicio: string, fim: string): SlotCalendario {
    return { id, status: 'selecionado', data, horario_inicio: inicio, horario_fim: fim, agenda_id: 1 };
}

describe('StepHorariosRecorrencia', () => {
    it('mostra o resumo agrupado por dia, unindo períodos contíguos', () => {
        const slots = [
            criarSlot('a', new Date(2026, 10, 20), '13:10:00', '14:00:00'),
            criarSlot('b', new Date(2026, 10, 20), '14:00:00', '15:40:00'),
            criarSlot('c', new Date(2026, 10, 21), '08:00:00', '09:00:00'),
        ];

        render(<StepHorariosRecorrencia formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={slots} />);

        expect(screen.getByText('Sex, 20/11')).toBeInTheDocument();
        expect(screen.getByText('13:10–15:40')).toBeInTheDocument();
        expect(screen.queryByText('13:10–14:00')).not.toBeInTheDocument();
        expect(screen.getByText('Sáb, 21/11')).toBeInTheDocument();
        expect(screen.getByText('08:00–09:00')).toBeInTheDocument();
        expect(screen.getByText('3 horários selecionados')).toBeInTheDocument();
    });

    it('indica quando não há horário selecionado', () => {
        render(<StepHorariosRecorrencia formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={[]} />);

        expect(screen.getByText('Nenhum horário selecionado.')).toBeInTheDocument();
    });

    it('não exibe o escopo de edição fora do modo edição', () => {
        render(<StepHorariosRecorrencia formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={[]} />);

        expect(screen.queryByText('Escopo da Edição')).not.toBeInTheDocument();
    });

    it('exibe o escopo de edição e propaga a troca de escopo', () => {
        const setFormData = jest.fn();

        render(
            <StepHorariosRecorrencia formData={criarFormData({ edit_scope: 'recurring' })} setFormData={setFormData} slotsSelecao={[]} isEditMode />,
        );

        expect(screen.getByText('Escopo da Edição')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText(/Apenas esta semana/));

        expect(setFormData).toHaveBeenCalledWith('edit_scope', 'single');
    });
});
