import { fireEvent, render, screen } from '@testing-library/react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

describe('ConfirmDeleteDialog', () => {
    it('renderiza titulo e descricao', () => {
        render(
            <ConfirmDeleteDialog
                open={true}
                onOpenChange={jest.fn()}
                title="Deletar Item"
                description="Tem certeza que deseja excluir este item?"
                onConfirm={jest.fn()}
            />,
        );

        expect(screen.getByText('Deletar Item')).toBeInTheDocument();
        expect(screen.getByText('Tem certeza que deseja excluir este item?')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    });

    it('chama onConfirm ao clicar no botao de confirmacao', () => {
        const onConfirm = jest.fn();
        render(
            <ConfirmDeleteDialog open={true} onOpenChange={jest.fn()} description="Confirmação" onConfirm={onConfirm} confirmText="Sim, deletar" />,
        );

        const confirmBtn = screen.getByRole('button', { name: 'Sim, deletar' });
        fireEvent.click(confirmBtn);

        expect(onConfirm).toHaveBeenCalled();
    });

    it('desabilita botao ao estar em estado de delecao', () => {
        render(<ConfirmDeleteDialog open={true} onOpenChange={jest.fn()} description="Confirmação" onConfirm={jest.fn()} isDeleting={true} />);

        expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled();
    });

    it('renderiza apenas o botao de fechar quando desabilitado com closeText', () => {
        const onOpenChange = jest.fn();
        render(
            <ConfirmDeleteDialog
                open={true}
                onOpenChange={onOpenChange}
                description="Item bloqueado para deleção"
                onConfirm={jest.fn()}
                disabled={true}
                closeText="Fechar"
            />,
        );

        expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
