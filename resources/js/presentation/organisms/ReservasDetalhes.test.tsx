import type { Horario, Reserva, User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import ReservaDetalhes from './ReservasDetalhes';

const mockReserva: Reserva = {
    id: 101,
    titulo: 'Palestra de Computação Quântica',
    descricao: 'Evento acadêmico com convidados externos',
    situacao: 'em_analise',
    data_inicial: new Date('2026-10-10T08:00:00Z'),
    data_final: new Date('2026-10-10T12:00:00Z'),
    recorrencia: 'unica',
    observacao: 'Precisa de projetor HDMI',
    created_at: '2026-10-01T10:00:00Z',
    updated_at: '2026-10-01T10:00:00Z',
    can_update: true,
    user: {
        id: 1,
        name: 'Carlos Silva',
        email: 'carlos@uesb.edu.br',
    } as User,
    horarios: [
        {
            id: 1,
            data: '2026-10-10',
            horario_inicio: '08:00:00',
            horario_fim: '12:00:00',
            situacao: 'em_analise',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            agenda: {
                id: 1,
                turno: 'manha',
                user: { id: 2, name: 'Gestor Manhã' } as User,
                espaco: {
                    id: 10,
                    nome: 'Auditório Central',
                    capacidade_pessoas: 120,
                    descricao: '',
                    imagens: [],
                    main_image_index: null,
                    andar: {
                        id: 1,
                        nome: 'andar-1',
                        modulo_id: 1,
                        created_at: '',
                        updated_at: '',
                        modulo: {
                            id: 1,
                            nome: 'Módulo 1',
                            unidade_id: 1,
                            created_at: '',
                            updated_at: '',
                        },
                    },
                },
            },
        } as unknown as Horario,
    ],
};

describe('ReservaDetalhes', () => {
    it('renderiza detalhes na visão do solicitante (Minhas Reservas)', () => {
        render(
            <ReservaDetalhes
                isOpen={true}
                onOpenChange={jest.fn()}
                selectedReserva={mockReserva}
                isGestor={false}
                setRemoverReserva={jest.fn()}
                routeName="reservas.index"
            />,
        );

        expect(screen.getByText('Palestra de Computação Quântica')).toBeInTheDocument();
        expect(screen.getByText('Auditório Central')).toBeInTheDocument();
        expect(screen.getByText(/Módulo 1/i)).toBeInTheDocument();
        expect(screen.getByText('Evento acadêmico com convidados externos')).toBeInTheDocument();
        expect(screen.getByText('Precisa de projetor HDMI')).toBeInTheDocument();
        expect(screen.getByText(/Avaliação dos Gestores/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Editar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
    });

    it('renderiza detalhes na visão do gestor (Gerir Reservas)', () => {
        render(
            <ReservaDetalhes
                isOpen={true}
                onOpenChange={jest.fn()}
                selectedReserva={mockReserva}
                isGestor={true}
                setRemoverReserva={jest.fn()}
                routeName="gestor.reservas.index"
            />,
        );

        expect(screen.getByText('Palestra de Computação Quântica')).toBeInTheDocument();
        expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
        expect(screen.getByText('carlos@uesb.edu.br')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Avaliar/i })).toBeInTheDocument();
    });

    it('chama setRemoverReserva ao clicar em Cancelar na visão do solicitante', () => {
        const onRemover = jest.fn();
        render(
            <ReservaDetalhes
                isOpen={true}
                onOpenChange={jest.fn()}
                selectedReserva={mockReserva}
                isGestor={false}
                setRemoverReserva={onRemover}
                routeName="reservas.index"
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onRemover).toHaveBeenCalledWith(mockReserva);
    });

    it('sincroniza a semana visível com o primeiro horário da reserva, não com a semana de hoje', () => {
        const futuraReserva: Reserva = {
            ...mockReserva,
            data_inicial: new Date('2026-09-10T08:00:00Z'),
            data_final: new Date('2026-09-10T12:00:00Z'),
            horarios: [
                {
                    ...mockReserva.horarios[0],
                    data: '2026-09-10',
                },
            ],
        };

        render(
            <ReservaDetalhes
                isOpen={true}
                onOpenChange={jest.fn()}
                selectedReserva={futuraReserva}
                isGestor={false}
                setRemoverReserva={jest.fn()}
                routeName="reservas.index"
            />,
        );

        expect(screen.getByText(/07\/09 - 13\/09\/2026/)).toBeInTheDocument();
    });
});
