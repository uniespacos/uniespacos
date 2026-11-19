import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import { StepRevisaoConfirmacao, StepRevisaoConfirmacaoProps } from './StepRevisaoConfirmacao';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(),
    releasePrivateChannel: jest.fn(),
}));

const espaco: Espaco = {
    id: 1,
    nome: 'Auditório Central',
    capacidade_pessoas: 200,
    descricao: '',
    imagens: [],
    main_image_index: null,
};

const slotsSelecao: SlotCalendario[] = [
    {
        id: '2026-11-17|08:00:00',
        status: 'selecionado',
        data: new Date(2026, 10, 17),
        horario_inicio: '08:00:00',
        horario_fim: '09:00:00',
        agenda_id: 1,
    },
];

function criarFormData(overrides: Partial<ReservaFormData> = {}): ReservaFormData {
    return {
        titulo: 'Seminário de Tecnologia',
        descricao: 'Palestras sobre inovação.',
        recorrencia: 'unica',
        data_inicial: new Date(2026, 10, 17),
        data_final: new Date(2026, 10, 17),
        horarios_solicitados: [{ data: '2026-11-17', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 1 }],
        termo_responsabilidade: false,
        ...overrides,
    };
}

function renderRevisao(props: Partial<StepRevisaoConfirmacaoProps> = {}, formOverrides: Partial<ReservaFormData> = {}) {
    const setFormData = jest.fn();
    const onRealtimeSlotsConflict = jest.fn();

    render(
        <StepRevisaoConfirmacao
            espaco={espaco}
            formData={criarFormData(formOverrides)}
            setFormData={setFormData}
            slotsSelecao={slotsSelecao}
            conflictingDates={[]}
            temConflito={false}
            quantidadeEmConflito={0}
            onRealtimeSlotsConflict={onRealtimeSlotsConflict}
            {...props}
        />,
    );

    return { setFormData, onRealtimeSlotsConflict };
}

describe('StepRevisaoConfirmacao', () => {
    it('apresenta primeiro o resumo com espaço, título, período e recorrência', () => {
        renderRevisao();

        expect(screen.getByText('Resumo da solicitação')).toBeInTheDocument();
        expect(screen.getByText('Auditório Central')).toBeInTheDocument();
        expect(screen.getByText('Seminário de Tecnologia')).toBeInTheDocument();
        expect(screen.getByText('de 17/11/2026 a 17/11/2026')).toBeInTheDocument();
        expect(screen.getByText('Apenas os horários selecionados')).toBeInTheDocument();
        expect(screen.getByText('Palestras sobre inovação.')).toBeInTheDocument();
    });

    it('mostra público e categoria apenas quando informados', () => {
        const { unmount } = render(
            <StepRevisaoConfirmacao
                espaco={espaco}
                formData={criarFormData({ publico_estimado: 40, categoria: 'Aula' })}
                setFormData={jest.fn()}
                slotsSelecao={slotsSelecao}
                conflictingDates={[]}
                temConflito={false}
                quantidadeEmConflito={0}
                onRealtimeSlotsConflict={jest.fn()}
            />,
        );

        expect(screen.getByText('40 pessoas')).toBeInTheDocument();
        expect(screen.getByText('Aula')).toBeInTheDocument();
        unmount();

        renderRevisao({}, { publico_estimado: '', categoria: '' });

        expect(screen.queryByText('Público estimado')).not.toBeInTheDocument();
        expect(screen.queryByText('Categoria')).not.toBeInTheDocument();
    });

    it('indica quando não há detalhes para o gestor', () => {
        renderRevisao({}, { descricao: '' });

        expect(screen.getByText('Nenhum detalhe informado.')).toBeInTheDocument();
    });

    it('calcula o total a gravar expandindo a recorrência', () => {
        renderRevisao(
            {},
            {
                recorrencia: '15dias',
                data_final: new Date(2026, 11, 1),
            },
        );

        expect(screen.getByText('Total a gravar: 3')).toBeInTheDocument();
    });

    it('na edição de semana única não expande a recorrência', () => {
        renderRevisao(
            { isEditMode: true },
            {
                recorrencia: '15dias',
                edit_scope: 'single',
                data_final: new Date(2026, 11, 1),
            },
        );

        expect(screen.getByText('Total a gravar: 1')).toBeInTheDocument();
    });

    it('propaga a aceitação do termo de responsabilidade', () => {
        const { setFormData } = renderRevisao();

        fireEvent.click(screen.getByRole('checkbox'));

        expect(setFormData).toHaveBeenCalledWith('termo_responsabilidade', true);
    });

    it('mostra a dica do termo enquanto não aceito e a oculta depois', () => {
        const { unmount } = render(
            <StepRevisaoConfirmacao
                espaco={espaco}
                formData={criarFormData({ termo_responsabilidade: false })}
                setFormData={jest.fn()}
                slotsSelecao={slotsSelecao}
                conflictingDates={[]}
                temConflito={false}
                quantidadeEmConflito={0}
                onRealtimeSlotsConflict={jest.fn()}
            />,
        );

        expect(screen.getByText('Aceite o termo de responsabilidade para enviar a solicitação.')).toBeInTheDocument();
        unmount();

        renderRevisao({}, { termo_responsabilidade: true });

        expect(screen.queryByText('Aceite o termo de responsabilidade para enviar a solicitação.')).not.toBeInTheDocument();
    });

    it('sem conflito não mostra bloqueio nem botão de remover', () => {
        renderRevisao({ temConflito: false, quantidadeEmConflito: 0, onRemoverConflitos: jest.fn() });

        expect(screen.queryByText('Remover horários em conflito')).not.toBeInTheDocument();
        expect(screen.queryByText(/Resolva os conflitos para enviar/)).not.toBeInTheDocument();
    });

    it('com conflito mostra o motivo do bloqueio e oferece remover os horários em conflito', () => {
        const onRemoverConflitos = jest.fn();

        renderRevisao({
            conflictingDates: ['17/11/2026'],
            temConflito: true,
            quantidadeEmConflito: 1,
            onRemoverConflitos,
        });

        expect(screen.getByText(/Resolva os conflitos para enviar/)).toBeInTheDocument();
        expect(screen.getByText('Já existem reservas aprovadas')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Remover horários em conflito/ }));

        expect(onRemoverConflitos).toHaveBeenCalledTimes(1);
    });

    it('com conflito sem slot identificável não oferece o botão de remover', () => {
        renderRevisao({
            conflictingDates: ['17/11/2026'],
            temConflito: true,
            quantidadeEmConflito: 0,
            onRemoverConflitos: jest.fn(),
        });

        expect(screen.queryByRole('button', { name: /Remover horários em conflito/ })).not.toBeInTheDocument();
        expect(screen.getByText(/Resolva os conflitos para enviar/)).toBeInTheDocument();
    });
});
