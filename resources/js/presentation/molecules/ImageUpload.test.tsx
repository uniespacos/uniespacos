import { fireEvent, render, screen } from '@testing-library/react';
import { ImageUpload, type ImageWithPreview } from './ImageUpload';

const imagensMock: ImageWithPreview[] = [
    { file: new File([''], 'frente.png', { type: 'image/png' }), preview: 'blob:frente' },
    { file: new File([''], 'fundo.png', { type: 'image/png' }), preview: 'blob:fundo' },
];

function renderImageUpload(overrides: Partial<Parameters<typeof ImageUpload>[0]> = {}) {
    const props = {
        imagesWithPreviews: imagensMock,
        setImagesWithPreviews: jest.fn(),
        mainImageIndex: 0,
        setMainImageIndex: jest.fn(),
        setImagesToDelete: jest.fn(),
        processing: false,
        errors: {},
        setData: jest.fn(),
        ...overrides,
    };
    render(<ImageUpload {...props} />);
    return props;
}

describe('ImageUpload', () => {
    it('expõe a imagem principal como botão pressionado', () => {
        renderImageUpload();

        expect(screen.getByRole('button', { name: 'Definir imagem 1 como principal' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'Definir imagem 2 como principal' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('define a imagem não principal ao acionar o botão nomeado', () => {
        const { setMainImageIndex } = renderImageUpload();

        fireEvent.click(screen.getByRole('button', { name: 'Definir imagem 2 como principal' }));

        expect(setMainImageIndex).toHaveBeenCalledWith(1);
    });

    it('nomeia o botão de remover cada imagem e aciona a remoção correta', () => {
        Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: jest.fn() });
        const { setImagesToDelete } = renderImageUpload();

        fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 2' }));

        expect(setImagesToDelete).toHaveBeenCalledWith('blob:fundo');
    });
});
