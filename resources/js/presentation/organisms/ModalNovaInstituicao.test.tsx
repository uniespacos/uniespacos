import { fireEvent, render, screen } from '@testing-library/react';
import { ModalNovaInstituicao } from './ModalNovaInstituicao';

const mockUseFormPost = jest.fn();
const mockUseFormSetData = jest.fn();

jest.mock('@inertiajs/react', () => ({
    useForm: (initialValues: Record<string, unknown>) => ({
        data: initialValues,
        setData: mockUseFormSetData,
        post: mockUseFormPost,
        processing: false,
        errors: {},
        reset: jest.fn(),
    }),
}));

describe('ModalNovaInstituicao', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global as unknown as { route: (name: string) => string }).route = jest.fn((name: string) => `/${name}`);
    });

    it('renders modal content when open is true', () => {
        render(<ModalNovaInstituicao open={true} onOpenChange={jest.fn()} />);

        expect(screen.getByText('Cadastrar Nova Instituição')).toBeInTheDocument();
        expect(screen.getByLabelText(/Nome da Instituição/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Sigla/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Endereço/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Salvar Instituição/i })).toBeInTheDocument();
    });

    it('calls onOpenChange with false when clicking cancel', () => {
        const onOpenChange = jest.fn();
        render(<ModalNovaInstituicao open={true} onOpenChange={onOpenChange} />);

        fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('submits form to institucional.instituicoes.store', () => {
        render(<ModalNovaInstituicao open={true} onOpenChange={jest.fn()} />);

        const submitBtn = screen.getByRole('button', { name: /Salvar Instituição/i });
        const form = submitBtn.closest('form');
        if (form) {
            fireEvent.submit(form);
        }
        expect(mockUseFormPost).toHaveBeenCalled();
    });
});
