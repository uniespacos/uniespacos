import { EscopoRecorrencia, RecorrenciaReserva } from '@/contracts';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { usePage } from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepHorariosRecorrencia } from './StepHorariosRecorrencia';

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

    afterEach(() => {
        jest.mocked(usePage).mockReturnValue({
            props: { auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);
    });

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
        expect(screen.getAllByText(/Apenas os horários selecionados/i).length).toBeGreaterThanOrEqual(1);
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
        expect(screen.getAllByText(/Apenas os horários selecionados/i).length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText(/Apenas esta semana/i).length).toBe(1);
    });

    it.each(['unica', '15dias', '1mes', 'personalizado'] as const)('desabilita a data inicial na recorrencia %s', (recorrencia) => {
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={{ ...mockFormData, recorrencia }}
                setFormData={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
            />,
        );

        expect(screen.getByRole('button', { name: /Data Inicial/i })).toBeDisabled();
    });

    it.each([
        ['unica', true],
        ['personalizado', false],
    ] as const)('data final na recorrencia %s desabilitada: %s', (recorrencia, desabilitada) => {
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={{ ...mockFormData, recorrencia }}
                setFormData={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
            />,
        );

        const botaoDataFinal = screen.getByRole('button', { name: '31/08/2026' });
        if (desabilitada) {
            expect(botaoDataFinal).toBeDisabled();
        } else {
            expect(botaoDataFinal).toBeEnabled();
        }
    });

    it('nao exibe mais o rotulo de ajuste na data inicial e indica que ela e calculada', () => {
        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={{ ...mockFormData, recorrencia: RecorrenciaReserva.PERSONALIZADO }}
                setFormData={jest.fn()}
                slotsSelecao={mockSlots}
                hoje={new Date('2026-08-25T00:00:00')}
            />,
        );

        expect(screen.queryByText(/ajusta horários/i)).not.toBeInTheDocument();
        expect(screen.getByText(/Data Inicial \(calculada\)/i)).toBeInTheDocument();
    });

    it('oculta slots alem de data_final ao encurtar recorrencia em edicao recurring', () => {
        const slotsCincoSemanas: SlotCalendario[] = [
            { ...mockSlots[0], id: '2026-11-24|08:00', data: new Date('2026-11-24T12:00:00') },
            { ...mockSlots[0], id: '2026-12-01|08:00', data: new Date('2026-12-01T12:00:00') },
            { ...mockSlots[0], id: '2026-12-08|08:00', data: new Date('2026-12-08T12:00:00') },
            { ...mockSlots[0], id: '2026-12-15|08:00', data: new Date('2026-12-15T12:00:00') },
            { ...mockSlots[0], id: '2026-12-22|08:00', data: new Date('2026-12-22T12:00:00') },
        ];

        render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    edit_scope: EscopoRecorrencia.RECURRING,
                    recorrencia: RecorrenciaReserva.QUINZE_DIAS,
                    data_inicial: new Date('2026-11-24T12:00:00'),
                    data_final: new Date('2026-12-08T12:00:00'),
                }}
                setFormData={jest.fn()}
                slotsSelecao={slotsCincoSemanas}
                hoje={new Date('2026-11-19T12:00:00')}
                isEditMode
            />,
        );

        expect(screen.getByText('3 horários')).toBeInTheDocument();
        expect(screen.getByText(/terça-feira, 08\/12\/2026/i)).toBeInTheDocument();
        expect(screen.queryByText(/15\/12\/2026/)).not.toBeInTheDocument();
        expect(screen.queryByText(/22\/12\/2026/)).not.toBeInTheDocument();
    });

    it('formata dias da semana nos slots de acordo com o idioma ativo (R-13)', () => {
        const mockUsePage = jest.mocked(usePage);
        mockUsePage.mockReturnValue({
            props: { locale: 'en', auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);

        const { rerender } = render(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
                slotsSelecao={[{ ...mockSlots[0], data: new Date('2026-08-25T12:00:00') }]}
                hoje={new Date('2026-08-25T12:00:00')}
            />,
        );

        expect(screen.getByText(/Tuesday, 25\/08\/2026/i)).toBeInTheDocument();

        mockUsePage.mockReturnValue({
            props: { locale: 'es', auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);

        rerender(
            <StepHorariosRecorrencia
                espaco={mockEspaco}
                formData={mockFormData}
                setFormData={jest.fn()}
                slotsSelecao={[{ ...mockSlots[0], data: new Date('2026-08-25T12:00:00') }]}
                hoje={new Date('2026-08-25T12:00:00')}
            />,
        );

        expect(screen.getByText(/martes, 25\/08\/2026/i)).toBeInTheDocument();
    });
});
