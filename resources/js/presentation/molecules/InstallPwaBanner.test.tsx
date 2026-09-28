import { fireEvent, render, screen } from '@testing-library/react';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { InstallPwaBanner } from './InstallPwaBanner';

jest.mock('@/hooks/usePwaInstallPrompt', () => ({
    usePwaInstallPrompt: jest.fn(),
}));

const mockedUsePwaInstallPrompt = usePwaInstallPrompt as jest.MockedFunction<typeof usePwaInstallPrompt>;

describe('InstallPwaBanner', () => {
    const mockPromptInstall = jest.fn();
    const mockDismissPrompt = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders nothing when isInstallable is false', () => {
        mockedUsePwaInstallPrompt.mockReturnValue({
            isInstallable: false,
            promptInstall: mockPromptInstall,
            dismissPrompt: mockDismissPrompt,
        });

        const { container } = render(<InstallPwaBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders banner when isInstallable is true', () => {
        mockedUsePwaInstallPrompt.mockReturnValue({
            isInstallable: true,
            promptInstall: mockPromptInstall,
            dismissPrompt: mockDismissPrompt,
        });

        render(<InstallPwaBanner />);

        expect(screen.getByRole('complementary', { name: /instalação do aplicativo/i })).toBeInTheDocument();
        expect(screen.getByText('Instalar UniEspaços')).toBeInTheDocument();
        expect(screen.getByText('Acesse em tela cheia na sua tela inicial')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument();
    });

    it('calls promptInstall when Instalar button is clicked', () => {
        mockedUsePwaInstallPrompt.mockReturnValue({
            isInstallable: true,
            promptInstall: mockPromptInstall,
            dismissPrompt: mockDismissPrompt,
        });

        render(<InstallPwaBanner />);

        const installButton = screen.getByRole('button', { name: /instalar/i });
        fireEvent.click(installButton);

        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
    });

    it('calls dismissPrompt when dismiss button is clicked', () => {
        mockedUsePwaInstallPrompt.mockReturnValue({
            isInstallable: true,
            promptInstall: mockPromptInstall,
            dismissPrompt: mockDismissPrompt,
        });

        render(<InstallPwaBanner />);

        const buttons = screen.getAllByRole('button');
        // The dismiss button has the X icon (variant ghost)
        const dismissButton = buttons[1];
        fireEvent.click(dismissButton);

        expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
    });
});
