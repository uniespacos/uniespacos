import type { Andar, Modulo, Unidade } from '@/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
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

const ROUTE = 'https://localhost/espacos';
const PLACEHOLDER_BUSCA = 'Buscar por nome do espaço, andar ou módulo...';

describe('EspacoFiltroBusca', () => {
    beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2026-11-19T12:00:00') });
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => `https://localhost/${name.replaceAll('.', '/')}`);
    });

    afterEach(() => {
        jest.useRealTimers();
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    it('renderiza campo de busca, selects de filtros e o campo de quantidade de pessoas', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />);

        expect(screen.getByPlaceholderText(PLACEHOLDER_BUSCA)).toBeInTheDocument();
        expect(screen.getAllByText('Todas as Unidades').length).toBeGreaterThan(0);
        expect(screen.getByLabelText('Quantas pessoas?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Filtros/i })).toBeInTheDocument();
    });

    it('não exibe os filtros de data e turno quando a disponibilidade não está habilitada', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />);

        expect(screen.queryByText('Quando?')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Turno')).not.toBeInTheDocument();
    });

    it('exibe data e turno desabilitado sem data quando a disponibilidade está habilitada', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} disponibilidade />);

        expect(screen.getByText('Quando?')).toBeInTheDocument();
        expect(screen.getByText('Selecione uma data')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Manhã' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Tarde' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Noite' })).toBeDisabled();
    });

    it('habilita o turno quando há data filtrada e mostra os chips de data e turno', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{ data: '2026-11-20', turno: 'tarde' }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                disponibilidade
            />,
        );

        expect(screen.getByRole('button', { name: 'Tarde' })).not.toBeDisabled();
        expect(screen.getByRole('button', { name: 'Tarde' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Data: sex, 20/11')).toBeInTheDocument();
        expect(screen.getByText('Turno: Tarde')).toBeInTheDocument();
    });

    it('permite selecionar atalhos rápidos de data (Hoje/Amanhã), turno e capacidade e minimizar o Step 1', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} disponibilidade />);

        fireEvent.click(screen.getByRole('button', { name: 'Hoje' }));
        expect(mockGet).toHaveBeenLastCalledWith(ROUTE, { data: '2026-11-19' }, expect.any(Object));

        fireEvent.click(screen.getByRole('button', { name: '25+' }));
        expect(mockGet).toHaveBeenLastCalledWith(ROUTE, { data: '2026-11-19', capacidade: '25' }, expect.any(Object));

        fireEvent.click(screen.getByRole('button', { name: /Minimizar busca/i }));
        expect(screen.queryByRole('button', { name: 'Hoje' })).not.toBeInTheDocument();
        expect(screen.getByText(/qui, 19\/11 • 25 pessoas/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Expandir busca/i }));
        expect(screen.getByRole('button', { name: 'Hoje' })).toBeInTheDocument();
    });

    it('remover a data também remove o turno, pois o turno só vale com data', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{ data: '2026-11-20', turno: 'manha' }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                disponibilidade
            />,
        );

        fireEvent.click(screen.getByLabelText('Remover filtro de Data'));

        expect(mockGet).toHaveBeenCalledWith(ROUTE, {}, expect.any(Object));
    });

    it('remove apenas o turno ao clicar no X do chip de turno, mantendo a data', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{ data: '2026-11-20', turno: 'noite' }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                disponibilidade
            />,
        );

        fireEvent.click(screen.getByLabelText('Remover filtro de Turno'));

        expect(mockGet).toHaveBeenCalledWith(ROUTE, { data: '2026-11-20' }, expect.any(Object));
    });

    it('atualiza o valor do input ao digitar na busca e limpa com botão de limpar', () => {
        render(
            <EspacoFiltroBusca route={ROUTE} filters={{ search: 'Auditorio' }} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />,
        );

        const input = screen.getByPlaceholderText(PLACEHOLDER_BUSCA);
        expect(input).toHaveValue('Auditorio');

        const clearBtn = screen.getByLabelText('Limpar busca');
        expect(clearBtn).toBeInTheDocument();

        fireEvent.click(clearBtn);
        expect(input).toHaveValue('');
    });

    it('renderiza chips de filtros ativos e botão de limpar tudo quando há filtros aplicados', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{
                    search: 'Laboratório',
                    unidade: '1',
                    capacidade: '50',
                }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
            />,
        );

        expect(screen.getByText(/Filtros ativos:/i)).toBeInTheDocument();
        expect(screen.getByText(/Busca: “Laboratório”/i)).toBeInTheDocument();
        expect(screen.getByText('Unidade: JQ')).toBeInTheDocument();
        expect(screen.getByText('Capacidade: 50 Lugares')).toBeInTheDocument();

        const clearAllBtn = screen.getByRole('button', { name: /Limpar tudo/i });
        expect(clearAllBtn).toBeInTheDocument();

        fireEvent.click(clearAllBtn);
        expect(mockGet).toHaveBeenCalledWith(ROUTE, {}, expect.any(Object));
    });

    it('limpa data, turno e capacidade ao clicar em limpar tudo', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{ data: '2026-11-20', turno: 'tarde', capacidade: '30' }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
                disponibilidade
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /Limpar tudo/i }));

        expect(mockGet).toHaveBeenCalledWith(ROUTE, {}, expect.any(Object));
    });

    it('remove filtro individual ao clicar no X do chip', () => {
        render(
            <EspacoFiltroBusca
                route={ROUTE}
                filters={{
                    unidade: '1',
                }}
                unidades={mockUnidades}
                modulos={mockModulos}
                andares={mockAndares}
            />,
        );

        const removeUnidadeBtn = screen.getByLabelText('Remover filtro de Unidade');
        fireEvent.click(removeUnidadeBtn);

        expect(mockGet).toHaveBeenCalledWith(ROUTE, {}, expect.any(Object));
    });

    it('envia a quantidade de pessoas como capacidade mínima somente após o debounce', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />);

        fireEvent.change(screen.getByLabelText('Quantas pessoas?'), { target: { value: '30' } });
        expect(mockGet).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith(ROUTE, { capacidade: '30' }, expect.any(Object));
    });

    it('não sobrescreve a quantidade digitada quando a resposta de uma busca anterior chega durante a digitação', () => {
        const { rerender } = render(
            <EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />,
        );
        const input = screen.getByLabelText('Quantas pessoas?');

        fireEvent.change(input, { target: { value: '1' } });
        act(() => {
            jest.advanceTimersByTime(400);
        });
        fireEvent.change(input, { target: { value: '12' } });

        rerender(
            <EspacoFiltroBusca route={ROUTE} filters={{ capacidade: '1' }} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />,
        );
        expect(input).toHaveValue(12);

        act(() => {
            jest.advanceTimersByTime(400);
        });
        expect(mockGet).toHaveBeenLastCalledWith(ROUTE, { capacidade: '12' }, expect.any(Object));
    });

    it('não envia capacidade quando o campo de quantidade não tem valor positivo', () => {
        render(<EspacoFiltroBusca route={ROUTE} filters={{ capacidade: '0' }} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />);

        expect(screen.queryByText(/Capacidade:/)).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Quantas pessoas?'), { target: { value: '0' } });
        act(() => {
            jest.advanceTimersByTime(400);
        });

        expect(mockGet).toHaveBeenCalledWith(ROUTE, {}, expect.any(Object));
    });

    it('mantém seletor de módulo habilitado mesmo sem unidade filtrada e sincroniza filtros externos', () => {
        const { rerender } = render(
            <EspacoFiltroBusca route={ROUTE} filters={{ modulo: '1' }} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />,
        );

        const moduloTrigger = document.getElementById('desktop-espacos-modulo');
        expect(moduloTrigger).not.toBeDisabled();
        expect(screen.getByText('Módulo: Módulo 1')).toBeInTheDocument();

        rerender(<EspacoFiltroBusca route={ROUTE} filters={{}} unidades={mockUnidades} modulos={mockModulos} andares={mockAndares} />);

        expect(screen.queryByText('Módulo: Módulo 1')).not.toBeInTheDocument();
    });
});
