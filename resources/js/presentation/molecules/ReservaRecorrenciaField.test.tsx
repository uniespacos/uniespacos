import { SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReservaRecorrenciaField } from './ReservaRecorrenciaField';

const HOJE = new Date(2026, 10, 19);

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

const slots: SlotCalendario[] = [
    { id: 'a', status: 'selecionado', data: new Date(2026, 10, 20), horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 1 },
];

describe('ReservaRecorrenciaField', () => {
    it('começa desligado para reserva única e não mostra as opções de repetição', () => {
        render(<ReservaRecorrenciaField formData={criarFormData()} setFormData={jest.fn()} slotsSelecao={slots} hoje={HOJE} />);

        expect(screen.getByRole('switch', { name: 'Repetir esta reserva?' })).not.toBeChecked();
        expect(screen.queryByRole('radio', { name: /15 dias|Próximos 15/ })).not.toBeInTheDocument();
    });

    it('ligar o switch escolhe 15 dias como padrão', () => {
        const setFormData = jest.fn();

        render(<ReservaRecorrenciaField formData={criarFormData()} setFormData={setFormData} slotsSelecao={slots} hoje={HOJE} />);

        fireEvent.click(screen.getByRole('switch', { name: 'Repetir esta reserva?' }));

        expect(setFormData).toHaveBeenCalledWith('recorrencia', '15dias');
    });

    it('desligar o switch volta para reserva única', () => {
        const setFormData = jest.fn();

        render(
            <ReservaRecorrenciaField
                formData={criarFormData({ recorrencia: '1mes', data_final: new Date(2026, 11, 20) })}
                setFormData={setFormData}
                slotsSelecao={slots}
                hoje={HOJE}
            />,
        );

        fireEvent.click(screen.getByRole('switch', { name: 'Repetir esta reserva?' }));

        expect(setFormData).toHaveBeenCalledWith('recorrencia', 'unica');
    });

    it('começa ligado quando a reserva editada já é recorrente e mostra a vigência', () => {
        render(
            <ReservaRecorrenciaField
                formData={criarFormData({ recorrencia: '15dias', data_inicial: new Date(2026, 10, 20), data_final: new Date(2026, 11, 4) })}
                setFormData={jest.fn()}
                slotsSelecao={slots}
                hoje={HOJE}
            />,
        );

        expect(screen.getByRole('switch', { name: 'Repetir esta reserva?' })).toBeChecked();
        expect(screen.getByText('Vigência: de 20/11 a 04/12')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Próximos 15 dias/ })).toBeChecked();
    });

    it('oferece as opções de repetição sem a opção de reserva única', () => {
        render(
            <ReservaRecorrenciaField formData={criarFormData({ recorrencia: '15dias' })} setFormData={jest.fn()} slotsSelecao={slots} hoje={HOJE} />,
        );

        expect(screen.getByRole('radio', { name: /Próximos 15 dias/ })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /1 mês/ })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /Período personalizado/ })).toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /Apenas os horários selecionados/ })).not.toBeInTheDocument();
    });

    it('só mostra o seletor de data final no período personalizado', () => {
        const setFormData = jest.fn();

        const { rerender } = render(
            <ReservaRecorrenciaField
                formData={criarFormData({ recorrencia: '15dias' })}
                setFormData={setFormData}
                slotsSelecao={slots}
                hoje={HOJE}
            />,
        );

        expect(screen.queryByText('Data final')).not.toBeInTheDocument();

        rerender(
            <ReservaRecorrenciaField
                formData={criarFormData({ recorrencia: 'personalizado', data_final: new Date(2026, 11, 4) })}
                setFormData={setFormData}
                slotsSelecao={slots}
                hoje={HOJE}
            />,
        );

        expect(screen.getByText('Data final')).toBeInTheDocument();
        expect(screen.getByLabelText('Data final')).toHaveTextContent('04/12/2026');
    });

    it('exibe o erro de data final quando informado', () => {
        render(
            <ReservaRecorrenciaField
                formData={criarFormData({ recorrencia: 'personalizado', data_final: new Date(2026, 11, 4) })}
                setFormData={jest.fn()}
                slotsSelecao={slots}
                hoje={HOJE}
                erro="A data final deve ser igual ou posterior à data inicial."
            />,
        );

        expect(screen.getByText('A data final deve ser igual ou posterior à data inicial.')).toBeInTheDocument();
    });
});
