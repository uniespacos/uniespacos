import type { User } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { UserSearchCombobox } from './UserSearchComboBox';

const mockUsuarios: User[] = [
    {
        id: 1,
        name: 'Carlos Alberto',
        email: 'carlos@uesb.edu.br',
        email_verified_at: '2026-01-01',
        telefone: '73999999999',
        roles: ['gestor'],
        permissions: [],
        setor_id: 1,
        unread_notifications: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
    },
    {
        id: 2,
        name: 'Ana Maria',
        email: 'ana@uesb.edu.br',
        email_verified_at: '2026-01-01',
        telefone: '73988888888',
        roles: ['comum'],
        permissions: [],
        setor_id: 1,
        unread_notifications: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
    },
];

describe('UserSearchCombobox', () => {
    it('renderiza o placeholder quando nenhum usuario esta selecionado', () => {
        render(<UserSearchCombobox usuarios={mockUsuarios} value={null} onValueChange={jest.fn()} placeholder="Selecione um gestor..." />);

        expect(screen.getByText('Selecione um gestor...')).toBeInTheDocument();
    });

    it('renderiza o nome e email do usuario selecionado', () => {
        render(<UserSearchCombobox usuarios={mockUsuarios} value={1} onValueChange={jest.fn()} />);

        expect(screen.getByText('Carlos Alberto')).toBeInTheDocument();
        expect(screen.getByText('carlos@uesb.edu.br')).toBeInTheDocument();
    });

    it('chama onValueChange(null) ao clicar no botao de limpar', () => {
        const onValueChange = jest.fn();
        render(<UserSearchCombobox usuarios={mockUsuarios} value={1} onValueChange={onValueChange} />);

        const clearBtn = screen.getByRole('button', { name: 'Limpar seleção' });
        fireEvent.click(clearBtn);

        expect(onValueChange).toHaveBeenCalledWith(null);
    });

    it('chama onValueChange com o id do usuario ao selecionar um item', () => {
        const onValueChange = jest.fn();
        render(<UserSearchCombobox usuarios={mockUsuarios} value={null} onValueChange={onValueChange} />);

        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);

        const item = screen.getByText('Ana Maria');
        fireEvent.click(item);

        expect(onValueChange).toHaveBeenCalledWith(2);
    });
});
