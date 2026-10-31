import type { CadastrarInstituicaoForm } from '@/types/admin-forms';
import { fireEvent, render, screen } from '@testing-library/react';
import InstituicaoForm from './InstituicaoForm';

const mockRouterGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mockRouterGet(...args);
        },
    },
}));

const dadosIniciais: CadastrarInstituicaoForm = {
    nome: 'Universidade Estadual do Sudoeste da Bahia',
    sigla: 'UESB',
    endereco: 'Estrada do Bem Querer, km 04',
};

describe('InstituicaoForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.instituicoes.index': '/institucional/instituicoes',
            };
            if (routes[name]) {
                return routes[name];
            }
            throw new Error(`Route "${name}" not found in mock`);
        });
    });

    afterEach(() => {
        delete (globalThis as unknown as { route?: unknown }).route;
    });

    const renderForm = (overrides: Partial<React.ComponentProps<typeof InstituicaoForm>> = {}) =>
        render(
            <InstituicaoForm
                data={dadosIniciais}
                setData={jest.fn()}
                submit={jest.fn()}
                errors={{}}
                processing={false}
                editMode={false}
                {...overrides}
            />,
        );

    it('mostra os botões Cancelar e Salvar no cadastro', () => {
        renderForm();

        expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
        expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'submit');
        expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
    });

    it('mostra o botão Atualizar na edição', () => {
        renderForm({ editMode: true });

        expect(screen.getByRole('button', { name: 'Atualizar' })).toHaveAttribute('type', 'submit');
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    });

    it('não repete título de página no formulário', () => {
        renderForm({ editMode: true });

        expect(screen.queryByText('Editar Instituição')).not.toBeInTheDocument();
        expect(screen.queryByText('Cadastrar Instituição')).not.toBeInTheDocument();
    });

    it('Cancelar volta para a listagem de instituições sem submeter', () => {
        const submit = jest.fn();
        renderForm({ submit });

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(mockRouterGet).toHaveBeenCalledWith('/institucional/instituicoes');
        expect(submit).not.toHaveBeenCalled();
    });

    it('mostra Salvando... e desabilita os botões durante o processamento', () => {
        renderForm({ processing: true });

        expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });
});
