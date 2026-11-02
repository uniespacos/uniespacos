import { act, fireEvent, render, screen } from '@testing-library/react';
import AndarStickFormActions from './AndarStickFormActions';

describe('AndarStickFormActions', () => {
    afterEach(() => {
        Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 0 });
    });

    it('nomeia o botão de voltar ao topo e aciona o callback', () => {
        Object.defineProperty(window, 'pageYOffset', { configurable: true, value: 500 });
        const onScrollToTop = jest.fn();
        render(<AndarStickFormActions processing={false} isEditMode={false} onScrollToTop={onScrollToTop} andaresCount={2} />);

        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });
        fireEvent.click(screen.getByRole('button', { name: 'Voltar ao topo' }));

        expect(onScrollToTop).toHaveBeenCalledTimes(1);
    });
});
