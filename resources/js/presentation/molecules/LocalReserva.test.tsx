import type { Espaco } from '@/types';
import { render, screen } from '@testing-library/react';
import { LocalReserva } from './LocalReserva';

const espaco = (overrides: Partial<Espaco> = {}): Espaco => ({
    id: 1,
    nome: 'Sala 203',
    capacidade_pessoas: 40,
    descricao: 'Sala de aula',
    imagens: [],
    main_image_index: null,
    ...overrides,
});

const comLocalizacao = (modulo?: string, andar?: string): Espaco =>
    espaco({
        andar: {
            id: 1,
            nome: andar ?? 'Terceiro Andar',
            tipo_acesso: [],
            modulo_id: 1,
            ...(modulo ? { modulo: { id: 1, nome: modulo, unidade_id: 1 } } : {}),
        },
    });

describe('LocalReserva', () => {
    it('shows the space name with module and floor underneath', () => {
        render(<LocalReserva espaco={comLocalizacao('Pavilhão Central', 'Terceiro Andar')} />);

        expect(screen.getByText('Sala 203')).toBeInTheDocument();
        expect(screen.getByText('Pavilhão Central - Terceiro Andar')).toBeInTheDocument();
    });

    it('shows only the floor when the module is not loaded', () => {
        render(<LocalReserva espaco={comLocalizacao(undefined, 'Terceiro Andar')} />);

        expect(screen.getByText('Sala 203')).toBeInTheDocument();
        expect(screen.getByText('Terceiro Andar')).toBeInTheDocument();
    });

    it('shows just the space name when the whole chain is missing', () => {
        render(<LocalReserva espaco={espaco()} />);

        expect(screen.getByText('Sala 203')).toBeInTheDocument();
        expect(screen.queryByText('-', { exact: true })).not.toBeInTheDocument();
    });

    it('renders a placeholder when there is no space at all', () => {
        render(<LocalReserva espaco={undefined} />);

        expect(screen.getByText('—')).toBeInTheDocument();
    });
});
