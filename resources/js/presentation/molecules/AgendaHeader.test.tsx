import { TooltipProvider } from '@/components/ui/tooltip';
import type { AgendaGestoresPorTurnoType, Espaco } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import AgendaHeader from './AgendaHeader';

describe('AgendaHeader', () => {
    const espaco = {
        id: 1,
        nome: 'Laboratório de Informática',
        descricao: 'Ambiente com 20 computadores',
        capacidade_pessoas: 20,
        imagens: [],
        main_image_index: null,
        andar: {
            id: 1,
            nome: 'terreo',
            tipo_acesso: ['rampa'],
            modulo: { id: 1, nome: 'Bloco A', unidade: { id: 1, nome: 'Campus Vitória', sigla: 'UESB' } },
        },
    } as unknown as Espaco;

    const gestores = new Map<string, AgendaGestoresPorTurnoType>([
        ['manha', { nome: 'Ana Gestora', email: 'ana@uesb.edu.br', departamento: 'DTI', agenda_id: 1 }],
    ]);

    function renderizar() {
        return render(
            <TooltipProvider>
                <AgendaHeader espaco={espaco} gestoresPorTurno={gestores} />
            </TooltipProvider>,
        );
    }

    it('exibe o nome do espaco como unico cabecalho, com nivel 1', () => {
        renderizar();

        expect(screen.getByRole('heading', { level: 1, name: 'Laboratório de Informática' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading')).toHaveLength(1);
    });

    it('mantem os selos visiveis sem abrir o detalhe', () => {
        renderizar();

        expect(screen.getByText('UESB')).toBeInTheDocument();
        expect(screen.getByText('Bloco A')).toBeInTheDocument();
        expect(screen.getByText('20 pessoas')).toBeInTheDocument();
    });

    it('descricao e gestores ficam recolhidos por padrao', () => {
        renderizar();

        const gatilho = screen.getByRole('button', { name: 'Detalhes do espaço e gestores' });

        expect(gatilho).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Ambiente com 20 computadores')).not.toBeInTheDocument();
        expect(screen.queryByText('ana@uesb.edu.br')).not.toBeInTheDocument();
    });

    it('ao expandir, mostra a descricao e os gestores por turno', () => {
        renderizar();

        fireEvent.click(screen.getByRole('button', { name: 'Detalhes do espaço e gestores' }));

        expect(screen.getByRole('button', { name: 'Detalhes do espaço e gestores' })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Ambiente com 20 computadores')).toBeInTheDocument();
        expect(screen.getByText('ana@uesb.edu.br')).toBeInTheDocument();
        expect(screen.getAllByText('Sem gestor definido')).toHaveLength(2);
    });
});
