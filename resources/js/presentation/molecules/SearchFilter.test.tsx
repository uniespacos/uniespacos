import { fireEvent, render, screen } from '@testing-library/react';
import { SearchFilter } from './SearchFilter';

describe('SearchFilter', () => {
    it('associa o label visível "Buscar" ao campo de busca', () => {
        render(<SearchFilter searchTerm="" onSearchTermChange={jest.fn()} placeholder="Nome ou sigla do setor..." />);

        const campo = screen.getByRole('searchbox', { name: 'Buscar' });
        expect(campo).toHaveAttribute('placeholder', 'Nome ou sigla do setor...');
    });

    it('propaga a alteração do termo de busca', () => {
        const onSearchTermChange = jest.fn();
        render(<SearchFilter searchTerm="" onSearchTermChange={onSearchTermChange} placeholder="Buscar..." />);

        fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar' }), { target: { value: 'João' } });

        expect(onSearchTermChange).toHaveBeenCalledWith('João');
    });
});
