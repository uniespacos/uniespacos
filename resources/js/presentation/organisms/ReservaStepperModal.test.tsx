import { resolverSituacaoInicialReserva } from '@/hooks/use-agenda-selection';
import { Agenda, Espaco, SlotCalendario, User } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ReservaStepperModal, ReservaStepperModalProps } from './ReservaStepperModal';

jest.mock('@/lib/echo-channel-registry', () => ({
    acquirePrivateChannel: jest.fn(),
    releasePrivateChannel: jest.fn(),
}));

const mockRouterGet = jest.fn<unknown, [string]>();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: [string]) => {
            return mockRouterGet(...args);
        },
    },
}));

describe('ReservaStepperModal', () => {
    let espaco: Espaco;
    let slots: SlotCalendario[];
    let formData: ReservaFormData;

    beforeEach(() => {
        (globalThis as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => name);

        espaco = {
            id: 1,
            nome: 'Auditório Central',
            capacidade_pessoas: 200,
            agendas: [],
            descricao: '',
            imagens: [],
            main_image_index: null,
        };

        slots = [
            {
                id: '2026-08-25|10:00:00',
                data: new Date(2026, 7, 25),
                horario_inicio: '10:00:00',
                horario_fim: '11:00:00',
                status: 'selecionado',
                agenda_id: 1,
            },
        ];

        formData = {
            titulo: 'Seminário de Tecnologia',
            descricao: '',
            recorrencia: 'unica',
            data_inicial: new Date(2026, 7, 25),
            data_final: new Date(2026, 7, 25),
            horarios_solicitados: [{ data: '2026-08-25', horario_inicio: '10:00:00', horario_fim: '11:00:00', agenda_id: 1 }],
            termo_responsabilidade: false,
        };
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
        jest.clearAllMocks();
    });

    function renderModal(props: Partial<ReservaStepperModalProps> = {}) {
        const onOpenChange = jest.fn();
        const onSubmit = jest.fn((e: React.SyntheticEvent) => {
            e.preventDefault();
        });
        const setFormData = jest.fn();

        render(
            <ReservaStepperModal
                isOpen={true}
                onOpenChange={onOpenChange}
                onSubmit={onSubmit}
                slotsSelecao={slots}
                hoje={new Date(2026, 7, 25)}
                isSubmitting={false}
                espaco={espaco}
                formData={formData}
                setFormData={setFormData}
                {...props}
            />,
        );

        return { onOpenChange, onSubmit, setFormData };
    }

    it('abre no passo Detalhes com subtítulo próprio e campos novos', () => {
        renderModal();

        expect(screen.getByText('Solicitar Reserva — Auditório Central')).toBeInTheDocument();
        expect(screen.getByText('Conte para o gestor o que vai acontecer')).toBeInTheDocument();
        expect(screen.getByLabelText('Detalhes para o gestor (opcional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Público estimado (opcional)')).toBeInTheDocument();
        expect(screen.getByLabelText('Categoria (opcional)')).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Repetir esta reserva?' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Avançar' })).toBeEnabled();
    });

    it('usa o título de edição no modo edição', () => {
        renderModal({ isEditMode: true });

        expect(screen.getByText('Editar Solicitação — Auditório Central')).toBeInTheDocument();
    });

    it('não avança sem título e mostra o erro inline', () => {
        formData.titulo = '   ';
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        expect(screen.getByText('O título da reserva é obrigatório.')).toBeInTheDocument();
        expect(screen.getByLabelText('Detalhes para o gestor (opcional)')).toBeInTheDocument();
    });

    it('avança para a revisão sem exigir justificativa', () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        expect(screen.getByText('Confira os horários e envie a solicitação ao gestor')).toBeInTheDocument();
        expect(screen.getByText('Resumo da solicitação')).toBeInTheDocument();
        expect(screen.getByText('Nenhum detalhe informado.')).toBeInTheDocument();
    });

    it('desabilita o envio até aceitar o termo de responsabilidade', () => {
        renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        expect(screen.getByRole('button', { name: 'Enviar solicitação' })).toBeDisabled();
        expect(screen.getByText('Aceite o termo de responsabilidade para enviar a solicitação.')).toBeInTheDocument();
    });

    it('envia quando o termo está aceito e não há conflito', () => {
        formData.termo_responsabilidade = true;
        const { onSubmit } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitação' }));

        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('bloqueia o envio enquanto houver conflito, mesmo com termo aceito, e explica o motivo', () => {
        formData.termo_responsabilidade = true;
        formData.horarios_solicitados = [{ data: '2026-08-25', horario_inicio: '10:00:00', horario_fim: '11:00:00', agenda_id: 1 }];
        espaco.agendas = [
            {
                id: 1,
                turno: 'manha',
                horarios: [{ id: 9, data: '2026-08-25', horario_inicio: '10:00:00', horario_fim: '11:00:00', situacao: 'deferida' }],
            },
        ];
        const { onSubmit } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        const botaoEnviar = screen.getByRole('button', { name: 'Enviar solicitação' });
        expect(botaoEnviar).toBeDisabled();
        expect(screen.getByText(/Resolva os conflitos para enviar/)).toBeInTheDocument();

        fireEvent.click(botaoEnviar);
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('no modo edição, o botão de salvar usa o rótulo de alteração', () => {
        formData.termo_responsabilidade = true;
        renderModal({ isEditMode: true });

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled();
    });

    it('mostra o estado de envio no botão final', () => {
        formData.termo_responsabilidade = true;
        renderModal({ isSubmitting: true });

        fireEvent.click(screen.getByRole('button', { name: 'Avançar' }));

        expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
    });

    it('na tela de sucesso, não mostra o formulário e leva às minhas reservas', () => {
        renderModal({ sucessoCriacao: true });

        expect(screen.getByText('Solicitação enviada!')).toBeInTheDocument();
        expect(screen.getByText('O gestor do turno vai avaliar seu pedido. Você recebe uma notificação quando houver resposta.')).toBeInTheDocument();
        expect(screen.queryByLabelText('Detalhes para o gestor (opcional)')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Ver minhas reservas' }));

        expect(mockRouterGet).toHaveBeenCalledWith('reservas.index');
    });

    it('na tela de sucesso, fazer outra solicitação fecha o modal', () => {
        const { onOpenChange } = renderModal({ sucessoCriacao: true });

        fireEvent.click(screen.getByRole('button', { name: 'Fazer outra solicitação' }));

        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('na tela de sucesso, exibe mensagem de auto-aprovacao quando a reserva nasce deferida', () => {
        renderModal({ sucessoCriacao: true, situacaoCriacao: 'deferida' });

        expect(screen.getByText('Solicitação enviada!')).toBeInTheDocument();
        expect(screen.getByText('Sua reserva foi aprovada automaticamente.')).toBeInTheDocument();
        expect(
            screen.queryByText('O gestor do turno vai avaliar seu pedido. Você recebe uma notificação quando houver resposta.'),
        ).not.toBeInTheDocument();
    });

    it('na tela de sucesso, exibe mensagem parcial quando apenas parte das agendas e gerida pelo solicitante', () => {
        renderModal({ sucessoCriacao: true, situacaoCriacao: 'parcialmente_deferida' });

        expect(screen.getByText('Solicitação enviada!')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Os horários sob sua gestão foram aprovados automaticamente. Os demais turnos aguardam avaliação do gestor responsável.',
            ),
        ).toBeInTheDocument();
    });

    it('calcula corretamente a situacao inicial prevista pela relacao entre solicitante e gestores das agendas', () => {
        const agendas: Agenda[] = [
            { id: 1, turno: 'manha', user: { id: 10, name: 'Gestor A' } as User },
            { id: 2, turno: 'tarde', user: { id: 20, name: 'Gestor B' } as User },
        ];

        expect(
            resolverSituacaoInicialReserva([{ data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 1 }], agendas, 10),
        ).toBe('deferida');

        expect(
            resolverSituacaoInicialReserva(
                [
                    { data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 1 },
                    { data: '2026-08-25', horario_inicio: '14:00:00', horario_fim: '15:00:00', agenda_id: 2 },
                ],
                agendas,
                10,
            ),
        ).toBe('parcialmente_deferida');

        expect(
            resolverSituacaoInicialReserva([{ data: '2026-08-25', horario_inicio: '08:00:00', horario_fim: '09:00:00', agenda_id: 1 }], agendas, 99),
        ).toBe('em_analise');
    });

    it('mantem classes de foco visivel nos botoes de acao do rodape do modal', () => {
        renderModal();

        const cancelarBtn = screen.getByRole('button', { name: /cancelar/i });
        const avancarBtn = screen.getByRole('button', { name: /avançar/i });

        expect(cancelarBtn).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2');
        expect(avancarBtn).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2');

        fireEvent.click(avancarBtn);

        const voltarBtn = screen.getByRole('button', { name: /voltar/i });
        const enviarBtn = screen.getByRole('button', { name: /enviar solicitação/i });

        expect(voltarBtn).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2');
        expect(enviarBtn).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-offset-2');
    });
});
