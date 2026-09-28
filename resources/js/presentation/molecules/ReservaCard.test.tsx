import type { Horario, Reserva } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { ReservaCard } from './ReservaCard';

const mockReserva: Reserva = {
    id: 42,
    titulo: 'Seminário de Inteligência Artificial',
    descricao: 'Apresentação de trabalhos finais',
    situacao: 'deferida',
    data_inicial: new Date('2026-09-01T09:00:00Z'),
    data_final: new Date('2026-09-01T12:00:00Z'),
    recorrencia: 'unica',
    observacao: null,
    created_at: '',
    updated_at: '',
    can_update: true,
    horarios: [
        {
            id: 1,
            data: '2026-09-01',
            horario_inicio: '09:00:00',
            horario_fim: '12:00:00',
            situacao: 'deferida',
            validation_status: 'completed',
            conflict_cache: null,
            cache_validated_at: null,
            agenda: {
                id: 1,
                turno: 'manha',
                espaco: {
                    id: 5,
                    nome: 'Laboratório 3',
                    capacidade_pessoas: 30,
                    descricao: '',
                    imagens: [],
                    main_image_index: null,
                    andar: {
                        id: 1,
                        nome: 'andar-2',
                        modulo_id: 1,
                        created_at: '',
                        updated_at: '',
                        modulo: {
                            id: 1,
                            nome: 'Módulo Central',
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

describe('ReservaCard', () => {
    it('renderiza título, localização, datas e badge de situação', () => {
        render(
            <ReservaCard
                reserva={mockReserva}
                isGestor={false}
                onDetalhes={jest.fn()}
                onAvaliar={jest.fn()}
                onEditar={jest.fn()}
                onCancelar={jest.fn()}
            />,
        );

        expect(screen.getByText('Seminário de Inteligência Artificial')).toBeInTheDocument();
        expect(screen.getByText('Laboratório 3 - Módulo Central - 2º Andar')).toBeInTheDocument();
        expect(screen.getByText('Deferida')).toBeInTheDocument();
    });

    it('executa ações de usuário comum (Detalhes, Editar, Cancelar)', () => {
        const onDetalhes = jest.fn();
        const onEditar = jest.fn();
        const onCancelar = jest.fn();

        render(
            <ReservaCard
                reserva={mockReserva}
                isGestor={false}
                onDetalhes={onDetalhes}
                onAvaliar={jest.fn()}
                onEditar={onEditar}
                onCancelar={onCancelar}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Detalhes/i }));
        expect(onDetalhes).toHaveBeenCalledWith(mockReserva);

        fireEvent.click(screen.getByRole('button', { name: /Editar/i }));
        expect(onEditar).toHaveBeenCalledWith(42);

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onCancelar).toHaveBeenCalledWith(mockReserva);
    });

    it('executa ação de gestor (Avaliar/Reavaliar)', () => {
        const onAvaliar = jest.fn();
        const reservaEmAnalise: Reserva = {
            ...mockReserva,
            situacao: 'em_analise',
        };

        render(
            <ReservaCard
                reserva={reservaEmAnalise}
                isGestor={true}
                onDetalhes={jest.fn()}
                onAvaliar={onAvaliar}
                onEditar={jest.fn()}
                onCancelar={jest.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Avaliar/i }));
        expect(onAvaliar).toHaveBeenCalledWith(42);
    });

    it('renderiza apenas botão Ver Detalhes quando callbacks opcionais são omitidos', () => {
        const onDetalhes = jest.fn();

        render(<ReservaCard reserva={mockReserva} isGestor={false} onDetalhes={onDetalhes} />);

        const detalhesButton = screen.getByRole('button', { name: /Ver Detalhes/i });
        expect(detalhesButton).toBeInTheDocument();

        fireEvent.click(detalhesButton);
        expect(onDetalhes).toHaveBeenCalledWith(mockReserva);

        expect(screen.queryByRole('button', { name: /Avaliar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Editar/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Cancelar/i })).not.toBeInTheDocument();
    });
});
