import { fireEvent, render, screen } from '@testing-library/react';
import { PaginacaoRelatorio } from './PaginacaoRelatorio';

describe('PaginacaoRelatorio', () => {
    it('nomeia cada página numerada e marca a página atual com aria-current', () => {
        render(<PaginacaoRelatorio totalItems={50} itemsPerPage={10} currentPage={2} onPageChange={jest.fn()} />);

        expect(screen.getByRole('navigation', { name: 'Paginação do relatório' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Ir para a página 2' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: 'Ir para a página 1' })).not.toHaveAttribute('aria-current');
    });

    it('chama onPageChange com a página escolhida pelo nome acessível', () => {
        const onPageChange = jest.fn();
        render(<PaginacaoRelatorio totalItems={50} itemsPerPage={10} currentPage={2} onPageChange={onPageChange} />);

        fireEvent.click(screen.getByRole('button', { name: 'Ir para a página 4' }));

        expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it('nomeia os controles de navegação entre páginas', () => {
        render(<PaginacaoRelatorio totalItems={50} itemsPerPage={10} currentPage={2} onPageChange={jest.fn()} />);

        expect(screen.getByRole('button', { name: 'Primeira página' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Página anterior' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Próxima página' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Última página' })).toBeInTheDocument();
    });
});
