import HeadingSmall from '@/presentation/atoms/HeadingSmall';
import { render, screen } from '@testing-library/react';
import SettingsLayout from './Layout';

jest.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { locale: 'pt-BR' } }),
    Link: ({ children, href }: { children: React.ReactNode; href: string; prefetch?: boolean }) => <a href={href}>{children}</a>,
}));

describe('SettingsLayout', () => {
    it('renderiza_configuracoes_como_h1_e_secoes_como_h2', () => {
        render(
            <SettingsLayout>
                <HeadingSmall title="Atualizar Senha" />
            </SettingsLayout>,
        );

        expect(screen.getByRole('heading', { level: 1, name: 'Configurações' })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(screen.getByRole('heading', { level: 2, name: 'Atualizar Senha' })).toBeInTheDocument();
    });
});
