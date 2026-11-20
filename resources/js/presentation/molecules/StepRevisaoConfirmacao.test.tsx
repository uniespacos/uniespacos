import { EscopoRecorrencia, RecorrenciaReserva } from '@/contracts';
import { Espaco } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { usePage } from '@inertiajs/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepRevisaoConfirmacao } from './StepRevisaoConfirmacao';

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

    const horarioManha = { horario_inicio: '07:30:00', horario_fim: '08:20:00', agenda_id: 1 };

    const mockFormData: ReservaFormData = {
        titulo: 'Workshop de React',
        descricao: 'Treinamento para a equipe de desenvolvimento.',
        publico_estimado: 50,
        categoria: 'Treinamento',
        recorrencia: 'unica',
        data_inicial: new Date('2026-08-25T00:00:00'),
        data_final: new Date('2026-08-31T00:00:00'),
        horarios_solicitados: [{ data: '2026-08-25', ...horarioManha }],
        termo_responsabilidade: false,
    };

    afterEach(() => {
        jest.mocked(usePage).mockReturnValue({
            props: { auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);
    });

    it('renders space summary and submitted fields', () => {
        render(<StepRevisaoConfirmacao espaco={mockEspaco} formData={mockFormData} setFormData={jest.fn()} />);

        expect(screen.getByText('Auditório Principal')).toBeInTheDocument();
        expect(screen.getByText(/150 pessoas/i)).toBeInTheDocument();
        expect(screen.getByText('Workshop de React')).toBeInTheDocument();
        expect(screen.getByText(/Treinamento para a equipe de desenvolvimento/i)).toBeInTheDocument();
        expect(screen.getByText(/^50 pessoas$/i)).toBeInTheDocument();
    });

    it('toggles responsibility checkbox via setFormData', () => {
        const handleSetFormData = jest.fn();
        render(<StepRevisaoConfirmacao espaco={mockEspaco} formData={mockFormData} setFormData={handleSetFormData} />);

        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();

        fireEvent.click(checkbox);
        expect(handleSetFormData).toHaveBeenCalledWith('termo_responsabilidade', true);
    });

    it('lista e conta a expansao da recorrencia de 15 dias, que e o que sera gravado', () => {
        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: '15dias',
                    data_inicial: new Date('2026-11-24T00:00:00'),
                    data_final: new Date('2026-12-08T00:00:00'),
                    horarios_solicitados: [{ data: '2026-11-24', ...horarioManha }],
                }}
                setFormData={jest.fn()}
            />,
        );

        expect(screen.getByText('24/11 • 07:30-08:20')).toBeInTheDocument();
        expect(screen.getByText('01/12 • 07:30-08:20')).toBeInTheDocument();
        expect(screen.getByText('08/12 • 07:30-08:20')).toBeInTheDocument();
        expect(screen.getByText('Total a gravar: 3')).toBeInTheDocument();
    });

    it('mantem apenas os horarios unicos na recorrencia unica', () => {
        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: 'unica',
                    data_final: new Date('2026-11-24T00:00:00'),
                    horarios_solicitados: [
                        { data: '2026-11-24', ...horarioManha },
                        { data: '2026-11-24', ...horarioManha },
                    ],
                }}
                setFormData={jest.fn()}
            />,
        );

        expect(screen.getByText('Total a gravar: 1')).toBeInTheDocument();
    });

    it('em edicao com escopo de semana unica nao expande a recorrencia', () => {
        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: '15dias',
                    edit_scope: 'single',
                    data_final: new Date('2026-12-08T00:00:00'),
                    horarios_solicitados: [{ data: '2026-11-24', ...horarioManha }],
                }}
                setFormData={jest.fn()}
                isEditMode
            />,
        );

        expect(screen.getByText('Total a gravar: 1')).toBeInTheDocument();
        expect(screen.queryByText('08/12 • 07:30-08:20')).not.toBeInTheDocument();
    });

    it('em edicao com escopo de todas as ocorrencias expande a recorrencia', () => {
        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: RecorrenciaReserva.QUINZE_DIAS,
                    edit_scope: EscopoRecorrencia.RECURRING,
                    data_final: new Date('2026-12-08T00:00:00'),
                    horarios_solicitados: [{ data: '2026-11-24', ...horarioManha }],
                }}
                setFormData={jest.fn()}
                isEditMode
            />,
        );

        expect(screen.getByText('Total a gravar: 3')).toBeInTheDocument();
    });

    it('em edicao single exibe na previa do periodo a faixa real dos horarios resultantes (R-04)', () => {
        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: RecorrenciaReserva.QUINZE_DIAS,
                    edit_scope: EscopoRecorrencia.SINGLE,
                    data_inicial: new Date('2026-11-24T00:00:00'),
                    data_final: new Date('2026-12-08T00:00:00'),
                    horarios_solicitados: [
                        { data: '2026-11-24', ...horarioManha },
                        { data: '2026-12-01', ...horarioManha },
                    ],
                }}
                setFormData={jest.fn()}
                isEditMode
            />,
        );

        expect(screen.getByText(/24\/11\/2026 até 01\/12\/2026/)).toBeInTheDocument();
        expect(screen.queryByText(/08\/12\/2026/)).not.toBeInTheDocument();
    });

    it.each([
        ['en', /11\/03\/2027 to 11\/03\/2027 \(1 slot\)/i],
        ['es', /11\/03\/2027 hasta 11\/03\/2027 \(1 horario\)/i],
    ] as const)('traduz conector de periodo na revisao em %s sem manter "até" (B-03)', (locale, esperado) => {
        jest.mocked(usePage).mockReturnValue({
            props: { locale, auth: { user: null }, errors: {}, flash: {} },
            url: '/',
            component: '',
            version: null,
        } as unknown as ReturnType<typeof usePage>);

        render(
            <StepRevisaoConfirmacao
                espaco={mockEspaco}
                formData={{
                    ...mockFormData,
                    recorrencia: RecorrenciaReserva.UNICA,
                    data_inicial: new Date('2027-03-11T00:00:00'),
                    data_final: new Date('2027-03-11T00:00:00'),
                    horarios_solicitados: [{ data: '2027-03-11', ...horarioManha }],
                }}
                setFormData={jest.fn()}
            />,
        );

        expect(screen.getByText(esperado)).toBeInTheDocument();
        expect(screen.queryByText(/até/i)).not.toBeInTheDocument();
    });
});
