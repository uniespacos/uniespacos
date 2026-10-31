import type { AndarFormData } from '@/types/admin-forms';
import { render, screen } from '@testing-library/react';
import AndarFormCard from './AndarFormCard';

const andarSuperior: AndarFormData = { id: 'andar-1', nome: '1º Andar', nivel: 1, tipo_acesso: ['escada'] };
const andarTerreo: AndarFormData = { id: 'andar-0', nome: 'Térreo', nivel: 0, tipo_acesso: ['terreo'] };

describe('AndarFormCard', () => {
    it('nomeia o botão de remover o andar pelo nível', () => {
        render(
            <AndarFormCard andar={andarSuperior} index={1} onUpdate={jest.fn()} onRemove={jest.fn()} todosAndares={[andarTerreo, andarSuperior]} />,
        );

        expect(screen.getByRole('button', { name: 'Remover 1º Andar' })).toBeInTheDocument();
    });

    it('associa cada tipo de acesso ao seu checkbox pelo label', () => {
        render(
            <AndarFormCard andar={andarSuperior} index={1} onUpdate={jest.fn()} onRemove={jest.fn()} todosAndares={[andarTerreo, andarSuperior]} />,
        );

        expect(screen.getByRole('checkbox', { name: 'Escada' })).toBeChecked();
        expect(screen.getByRole('checkbox', { name: 'Elevador' })).not.toBeChecked();
    });
});
