import type { Andar, Modulo, Unidade } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import EspacoFiltroBusca from './EspacoFiltroBusca';

const mockGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mockGet(...args);
        },
    },
}));

const mockUnidades: Unidade[] = [{ id: 1, nome: 'Campus Jequié', sigla: 'JQ' }];
const mockModulos: Modulo[] = [{ id: 1, nome: 'Módulo 1', unidade_id: 1 }];
const mockAndares: Andar[] = [{ id: 1, nome: '1', modulo_id: 1, tipo_acesso: [] }];

describe('EspacoFiltroBusca', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza campo de busca e selects de filtros', () => {
        render(
            <EspacoFiltroBusca
                route="https://localhost/espacos"
                filters={{}}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                capacidadeEspacos={[20, 50]}
            />,
        );

        expect(screen.getByPlaceholderText('Buscar por nome do espaço, andar ou módulo...')).toBeInTheDocument();
        expect(screen.getAllByText('Todas as Unidades').length).toBeGreaterThan(0);
        expect(screen.getByRole('button', { name: /Filtros/i })).toBeInTheDocument();
    });

    it('atualiza o valor do input ao digitar na busca e limpa com botão de limpar', () => {
        render(
            <EspacoFiltroBusca
                route="https://localhost/espacos"
                filters={{ search: 'Auditorio' }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                capacidadeEspacos={[20, 50]}
            />,
        );

        const input = screen.getByPlaceholderText('Buscar por nome do espaço, andar ou módulo...');
        expect(input).toHaveValue('Auditorio');

        const clearBtn = screen.getByLabelText('Limpar busca');
        expect(clearBtn).toBeInTheDocument();

        fireEvent.click(clearBtn);
        expect(input).toHaveValue('');
    });

    it('renderiza chips de filtros ativos e botão de limpar tudo quando há filtros aplicados', () => {
        render(
            <EspacoFiltroBusca
                route="https://localhost/espacos"
                filters={{
                    search: 'Laboratório',
                    unidade: '1',
                    capacidade: '50',
                }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                capacidadeEspacos={[20, 50]}
            />,
        );

        expect(screen.getByText(/Filtros ativos:/i)).toBeInTheDocument();
        expect(screen.getByText(/Busca: “Laboratório”/i)).toBeInTheDocument();
        expect(screen.getByText('Unidade: JQ')).toBeInTheDocument();
        expect(screen.getByText('Capacidade: 50 Lugares')).toBeInTheDocument();

        const clearAllBtn = screen.getByRole('button', { name: /Limpar tudo/i });
        expect(clearAllBtn).toBeInTheDocument();

        fireEvent.click(clearAllBtn);
        expect(mockGet).toHaveBeenCalledWith('https://localhost/espacos', {}, expect.any(Object));
    });

    it('remove filtro individual ao clicar no X do chip', () => {
        render(
            <EspacoFiltroBusca
                route="https://localhost/espacos"
                filters={{
                    unidade: '1',
                }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                capacidadeEspacos={[20, 50]}
            />,
        );

        const removeUnidadeBtn = screen.getByLabelText('Remover filtro de unidade');
        fireEvent.click(removeUnidadeBtn);

        expect(mockGet).toHaveBeenCalledWith('https://localhost/espacos', {}, expect.any(Object));
    });
});
