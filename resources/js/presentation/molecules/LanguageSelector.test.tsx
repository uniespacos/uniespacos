import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageSelector } from './LanguageSelector';

const mockRouterPost = jest.fn();

jest.mock('@inertiajs/react', () => ({
    usePage: jest.fn(() => ({
        props: {
            locale: 'pt-BR',
        },
    })),
    router: {
        post: (...args: unknown[]) => {
            mockRouterPost(...args);
        },
    },
}));

describe('LanguageSelector', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the language selector trigger button', () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /selecionar idioma/i });
        expect(button).toBeInTheDocument();
    });

    it('opens menu and triggers router post when selecting a new locale', () => {
        render(<LanguageSelector />);

        const button = screen.getByRole('button', { name: /selecionar idioma/i });
        fireEvent.keyDown(button, { key: 'Enter' });

        const enOption = screen.getByText('English');
        expect(enOption).toBeInTheDocument();

        fireEvent.click(enOption);

        expect(mockRouterPost).toHaveBeenCalledWith(
            '/locale/en',
            {},
            expect.objectContaining({
                preserveScroll: true,
                
            }),
        );
    });
});
