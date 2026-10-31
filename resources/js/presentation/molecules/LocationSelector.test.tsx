import { render, screen } from '@testing-library/react';
import { LocationSelector } from './LocationSelector';

function renderLocationSelector() {
    render(
        <LocationSelector
            unidades={[]}
            modulos={[]}
            andares={[]}
            unidadeSelecionada={undefined}
            setUnidadeSelecionada={jest.fn()}
            moduloSelecionado={undefined}
            handleModuloChange={jest.fn()}
            andarSelecionado={undefined}
            handleAndarChange={jest.fn()}
            processing={false}
            errors={{}}
        />,
    );
}

describe('LocationSelector', () => {
    it('nomeia os seletores de localização pelos labels visíveis', () => {
        renderLocationSelector();

        expect(screen.getByRole('combobox', { name: 'Unidade' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Módulo' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Andar' })).toBeInTheDocument();
    });

    it('nomeia o botão desabilitado de adicionar andar', () => {
        renderLocationSelector();

        expect(screen.getByRole('button', { name: 'Adicionar andar' })).toBeDisabled();
    });
});
