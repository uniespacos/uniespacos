import type { Instituicao, Modulo, Unidade } from '@/types';
import type { CadastrarModuloForm } from '@/types/admin-forms';
import { fireEvent, render, screen } from '@testing-library/react';
import ModuloForm, { type ModuloFormProps } from './ModuloForm';

const mockRouterGet = jest.fn();

jest.mock('@inertiajs/react', () => ({
    router: {
        get: (...args: unknown[]) => {
            mockRouterGet(...args);
        },
    },
}));

jest.mock('@/presentation/organisms/AndarManager', () => ({
    __esModule: true,
    default: () => <div>Andares Manager</div>,
}));

jest.mock('@/presentation/organisms/AndarStickFormActions', () => ({
    __esModule: true,
    default: () => <div>Andar Stick Actions</div>,
}));

const instituicao: Instituicao = {
    id: 1,
    nome: 'Universidade Estadual do Sudoeste da Bahia',
    sigla: 'UESB',
    endereco: 'Estrada do Bem Querer, km 04',
};

const unidades: Unidade[] = [
    {
        id: 1,
        nome: 'Campus Jequié',
        sigla: 'JQ',
        instituicao,
    },
];

const dadosIniciais: CadastrarModuloForm = {
    nome: '',
    unidade_id: '',
    andares: [],
};

const modulo: Modulo = {
    id: 7,
    nome: 'Módulo Central',
    unidade_id: 1,
    andars: [],
};

describe('ModuloForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (globalThis as unknown as { route: jest.Mock }).route = jest.fn((name: string) => {
            const routes: Record<string, string> = {
                'institucional.modulos.index': '/institucional/modulos',
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

    const renderForm = (overrides: Partial<ModuloFormProps> = {}) =>
        render(
            <ModuloForm
                data={dadosIniciais}
                setData={jest.fn()}
                submit={jest.fn()}
                errors={{}}
                processing={false}
                instituicao={instituicao}
                unidades={unidades}
                {...overrides}
            />,
        );

    it('mostra os botões Cancelar e Salvar no cadastro', () => {
        renderForm();

        expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
        expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'submit');
        expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
    });

    it('mostra o botão Atualizar e o ID do módulo na edição', () => {
        renderForm({ modulo });

        expect(screen.getByText('ID do Módulo: 7')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    });

    it('não repete título de página no formulário', () => {
        renderForm({ modulo });

        expect(screen.queryByText('Editar Módulo')).not.toBeInTheDocument();
        expect(screen.queryByText('Cadastrar Módulo')).not.toBeInTheDocument();
    });

    it('Cancelar volta para a listagem de módulos sem submeter', () => {
        const submit = jest.fn();
        renderForm({ submit });

        fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

        expect(mockRouterGet).toHaveBeenCalledWith('/institucional/modulos');
        expect(submit).not.toHaveBeenCalled();
    });

    it('mostra Salvando... e desabilita os botões durante o processamento', () => {
        renderForm({ processing: true });

        expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    });
});
