import type { Instituicao } from '@/types';
import { render, screen } from '@testing-library/react';
import { SeletorInstituicao } from './SeletorInstituicao';

const mockInstituicoes: Instituicao[] = [
    {
        id: 1,
        nome: 'Universidade Teste',
        sigla: 'UT',
        endereco: 'Rua Principal, 123',
        setors: [
            {
                id: 10,
                nome: 'Setor Alfa',
                sigla: 'SA',
                unidade: { id: 1, nome: 'Unidade 1', sigla: 'U1' },
            },
            {
                id: 20,
                nome: 'Setor Beta',
                sigla: 'SB',
                unidade: { id: 1, nome: 'Unidade 1', sigla: 'U1' },
            },
        ],
    },
];

describe('SeletorInstituicao', () => {
    it('initializes institution and sector when initialSetorId is provided', () => {
        const onInstituicaoChange = jest.fn();
        const onSetorChange = jest.fn();

        render(
            <SeletorInstituicao
                instituicaos={mockInstituicoes}
                processing={false}
                errors={{}}
                initialSetorId="10"
                onInstituicaoChange={onInstituicaoChange}
                onSetorChange={onSetorChange}
            />,
        );

        expect(onInstituicaoChange).toHaveBeenCalledWith('1');
    });

    it('allows changing sector without resetting back to initialSetorId', () => {
        const onSetorChange = jest.fn();

        render(
            <SeletorInstituicao instituicaos={mockInstituicoes} processing={false} errors={{}} initialSetorId="10" onSetorChange={onSetorChange} />,
        );

        expect(screen.getByText('[U1] - Setor Alfa')).toBeInTheDocument();
    });
});
