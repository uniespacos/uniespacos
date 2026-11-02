import { render, screen } from '@testing-library/react';
import RelatoriosGestorPage from './RelatoriosGestorPage';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { locale: 'pt-BR' } }),
    Head: ({ title }: { title: string }) => <title>{title}</title>,
    router: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('@/presentation/templates/AppLayout', () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/hooks/use-dados-relatorio', () => ({
    useDadosRelatorio: () => ({ dados: null, status: 'idle', erro: null }),
}));

jest.mock('@/hooks/use-gerar-relatorio', () => ({
    useGerarRelatorio: () => ({ gerar: jest.fn(), estaGerando: false }),
}));

jest.mock('@/presentation/organisms/ExportarRelatorio', () => ({
    ExportarRelatorio: () => <div data-testid="exportar-relatorio">Exportar</div>,
}));

jest.mock('@/presentation/organisms/FiltrosReservasPeriodo', () => ({
    FiltrosReservasPeriodo: () => null,
}));

jest.mock('@/presentation/organisms/FiltrosOcupacaoEspacos', () => ({
    FiltrosOcupacaoEspacos: () => null,
}));

jest.mock('@/presentation/organisms/FiltrosInventarioEspacos', () => ({
    FiltrosInventarioEspacos: () => null,
}));

describe('RelatoriosGestorPage', () => {
    const props = {
        tipos_disponiveis: [],
        opcoes_inventario: { unidades: [], modulos: [], andares: [] },
    } as unknown as React.ComponentProps<typeof RelatoriosGestorPage>;

    it('define_title_do_documento_igual_ao_h1', () => {
        render(<RelatoriosGestorPage {...props} />);

        expect(document.title).toBe('Relatórios — Gestão de Espaços');
        expect(screen.getByRole('heading', { level: 1, name: 'Relatórios — Gestão de Espaços' })).toBeInTheDocument();
    });

    it('mantem_exportacao_no_cabecalho', () => {
        render(<RelatoriosGestorPage {...props} />);

        expect(screen.getByTestId('exportar-relatorio')).toBeInTheDocument();
    });
});
