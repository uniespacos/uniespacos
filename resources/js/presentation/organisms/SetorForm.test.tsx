import { Instituicao, Setor, Unidade } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { SetorForm } from './SetorForm';

const mockInstituicao: Instituicao = {
    id: 1,
    nome: 'Universidade Estadual do Sudoeste da Bahia',
    sigla: 'UESB',
    endereco: 'Estrada do Bem Querer, km 04',
};

const mockUnidades: Unidade[] = [
    {
        id: 1,
        nome: 'Campus Vitória da Conquista',
        sigla: 'VCA',
        instituicao: mockInstituicao,
    },
];

const mockSetor: Setor = {
    id: 5,
    nome: 'Coordenação de Informática',
    sigla: 'INFO',
    unidade: mockUnidades[0],
};

const mockUseFormPost = jest.fn();
const mockUseFormPut = jest.fn();
const mockUseFormSetData = jest.fn();

jest.mock('@inertiajs/react', () => ({
    useForm: (initialValues: Record<string, unknown>) => ({
        data: initialValues,
        setData: mockUseFormSetData,
        post: mockUseFormPost,
        put: mockUseFormPut,
        processing: false,
        errors: {},
        reset: jest.fn(),
    }),
}));

describe('SetorForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global as unknown as { route: (name: string, params?: unknown) => string }).route = jest.fn((name: string) => `/${name}`);
    });

    it('renders fields correctly in create mode', () => {
        render(<SetorForm instituicao={mockInstituicao} unidades={mockUnidades} onCancel={jest.fn()} />);

        expect(screen.getByLabelText(/Instituição/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Unidade/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Nome do Setor/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Sigla/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Criar Setor/i })).toBeInTheDocument();
    });

    it('renders button with update label when editing an existing sector', () => {
        render(<SetorForm setor={mockSetor} instituicao={mockInstituicao} unidades={mockUnidades} onCancel={jest.fn()} />);

        expect(screen.getByRole('button', { name: /Atualizar/i })).toBeInTheDocument();
    });

    it('calls post when submitting new sector', () => {
        const onSuccess = jest.fn();
        render(<SetorForm instituicao={mockInstituicao} unidades={mockUnidades} onSuccess={onSuccess} onCancel={jest.fn()} />);

        const submitBtn = screen.getByRole('button', { name: /Criar Setor/i });
        const form = submitBtn.closest('form');
        if (form) {
            fireEvent.submit(form);
        }
        expect(mockUseFormPost).toHaveBeenCalled();
    });

    it('calls put when submitting existing sector update', () => {
        const onSuccess = jest.fn();
        render(<SetorForm setor={mockSetor} instituicao={mockInstituicao} unidades={mockUnidades} onSuccess={onSuccess} onCancel={jest.fn()} />);

        const submitBtn = screen.getByRole('button', { name: /Atualizar/i });
        const form = submitBtn.closest('form');
        if (form) {
            fireEvent.submit(form);
        }
        expect(mockUseFormPut).toHaveBeenCalled();
    });

    it('calls onCancel when clicking cancel button', () => {
        const onCancel = jest.fn();
        render(<SetorForm instituicao={mockInstituicao} unidades={mockUnidades} onCancel={onCancel} />);

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
