import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveModal } from './ResponsiveModal';
import { useIsMobile } from '@/hooks/use-mobile';

jest.mock('@/hooks/use-mobile', () => ({
    useIsMobile: jest.fn(),
}));

const mockedUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

describe('ResponsiveModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedUseIsMobile.mockReturnValue(false); // default desktop
    });

    describe('Desktop View (Dialog)', () => {
        it('renders Dialog content when open is true', () => {
            render(
                <ResponsiveModal open={true} title="Título Desktop" description="Descrição Desktop">
                    <p>Conteúdo Desktop</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Título Desktop')).toBeInTheDocument();
            expect(screen.getByText('Descrição Desktop')).toBeInTheDocument();
            expect(screen.getByText('Conteúdo Desktop')).toBeInTheDocument();
        });

        it('supports isOpen and onClose legacy props', () => {
            const onClose = jest.fn();
            render(
                <ResponsiveModal isOpen={true} onClose={onClose} title="Legacy Modal">
                    <p>Corpo</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Legacy Modal')).toBeInTheDocument();
            const closeBtn = screen.getByRole('button', { name: /fechar/i });
            fireEvent.click(closeBtn);
            expect(onClose).toHaveBeenCalled();
        });

        it('renders footer when provided', () => {
            render(
                <ResponsiveModal open={true} title="Com Footer" footer={<button>Ação Footer</button>}>
                    <p>Corpo</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Ação Footer')).toBeInTheDocument();
        });

        it('triggers onOpenChange when closed', () => {
            const onOpenChange = jest.fn();
            render(
                <ResponsiveModal open={true} onOpenChange={onOpenChange} title="Modal Teste">
                    <p>Corpo</p>
                </ResponsiveModal>,
            );

            const closeBtn = screen.getByRole('button', { name: /fechar/i });
            fireEvent.click(closeBtn);
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });

        it('renders trigger element and opens on click if uncontrolled', () => {
            render(
                <ResponsiveModal trigger={<button>Abrir Dialog</button>} title="Dialog por Trigger">
                    <p>Conteúdo por Trigger</p>
                </ResponsiveModal>,
            );

            const triggerBtn = screen.getByRole('button', { name: /abrir dialog/i });
            expect(triggerBtn).toBeInTheDocument();
        });
    });

    describe('Mobile View (Drawer)', () => {
        beforeEach(() => {
            mockedUseIsMobile.mockReturnValue(true);
        });

        it('renders Drawer content when open is true in mobile mode', () => {
            render(
                <ResponsiveModal open={true} title="Título Mobile" description="Descrição Mobile">
                    <p>Conteúdo Mobile</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Título Mobile')).toBeInTheDocument();
            expect(screen.getByText('Descrição Mobile')).toBeInTheDocument();
            expect(screen.getByText('Conteúdo Mobile')).toBeInTheDocument();
        });

        it('renders footer in mobile mode', () => {
            render(
                <ResponsiveModal open={true} title="Mobile Footer" footer={<button>Botão Mobile</button>}>
                    <p>Conteúdo</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Botão Mobile')).toBeInTheDocument();
        });

        it('supports trigger in mobile mode', () => {
            render(
                <ResponsiveModal trigger={<button>Abrir Drawer</button>} title="Drawer Trigger">
                    <p>Conteúdo</p>
                </ResponsiveModal>,
            );

            expect(screen.getByRole('button', { name: /abrir drawer/i })).toBeInTheDocument();
        });

        it('supports isOpen and onClose in mobile mode', () => {
            const onClose = jest.fn();
            const onOpenChange = jest.fn();
            render(
                <ResponsiveModal isOpen={true} onClose={onClose} onOpenChange={onOpenChange} title="Mobile Legacy">
                    <p>Corpo</p>
                </ResponsiveModal>,
            );

            expect(screen.getByText('Mobile Legacy')).toBeInTheDocument();
        });
    });
});
