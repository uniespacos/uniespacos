import { EscopoRecorrencia, RecorrenciaReserva } from '@/contracts';
import { SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { usePage } from '@inertiajs/react';
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
    afterEach(() => {
        jest.mocked(usePage).mockReturnValue({
            props: { auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);
    });

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

    it('oculta slots alem de data_final ao encurtar recorrencia em edicao recurring', () => {
        const slotsCincoSemanas: SlotCalendario[] = [
            criarSlot('2026-11-24|08:00', new Date('2026-11-24T12:00:00'), '08:00:00', '09:00:00'),
            criarSlot('2026-12-01|08:00', new Date('2026-12-01T12:00:00'), '08:00:00', '09:00:00'),
            criarSlot('2026-12-08|08:00', new Date('2026-12-08T12:00:00'), '08:00:00', '09:00:00'),
            criarSlot('2026-12-15|08:00', new Date('2026-12-15T12:00:00'), '08:00:00', '09:00:00'),
            criarSlot('2026-12-22|08:00', new Date('2026-12-22T12:00:00'), '08:00:00', '09:00:00'),
        ];

        render(
            <StepHorariosRecorrencia
                formData={criarFormData({
                    edit_scope: EscopoRecorrencia.RECURRING,
                    recorrencia: RecorrenciaReserva.QUINZE_DIAS,
                    data_inicial: new Date('2026-11-24T12:00:00'),
                    data_final: new Date('2026-12-08T12:00:00'),
                })}
                setFormData={jest.fn()}
                slotsSelecao={slotsCincoSemanas}
                isEditMode
            />,
        );

        expect(screen.getByText('3 horários selecionados')).toBeInTheDocument();
        expect(screen.getByText('Ter, 08/12')).toBeInTheDocument();
        expect(screen.queryByText(/15\/12/)).not.toBeInTheDocument();
        expect(screen.queryByText(/22\/12/)).not.toBeInTheDocument();
    });

    it('formata dias da semana nos slots de acordo com o idioma ativo (R-13)', () => {
        const mockUsePage = jest.mocked(usePage);
        mockUsePage.mockReturnValue({
            props: { locale: 'en', auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);

        const slots = [criarSlot('2026-08-25|08:00', new Date('2026-08-25T12:00:00'), '08:00:00', '09:00:00')];

        const { rerender } = render(<StepHorariosRecorrencia formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={slots} />);

        expect(screen.getByText('Tue, 25/08')).toBeInTheDocument();

        mockUsePage.mockReturnValue({
            props: { locale: 'es', auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);

        rerender(<StepHorariosRecorrencia formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={slots} />);

        expect(screen.getByText('Mar, 25/08')).toBeInTheDocument();
    });
});
