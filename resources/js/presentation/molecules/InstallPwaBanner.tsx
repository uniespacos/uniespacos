import { Button } from '@/components/ui/button';
import { usePwaInstallPrompt } from '@/hooks/usePwaInstallPrompt';
import { Download, X } from 'lucide-react';
import React from 'react';

export const InstallPwaBanner: React.FC = () => {
    const { isInstallable, promptInstall, dismissPrompt } = usePwaInstallPrompt();

    if (!isInstallable) return null;

    return (
        <aside
            aria-label="Instalação do aplicativo"
            className="bg-card/95 border-primary/20 animate-in slide-in-from-bottom fixed right-4 bottom-20 left-4 z-40 flex items-center justify-between gap-3 rounded-xl border p-3.5 shadow-xl backdrop-blur-md duration-300 md:right-6 md:bottom-6 md:left-auto md:max-w-md"
        >
            <div className="flex items-center gap-3">
                <div className="bg-primary/10 text-primary rounded-lg p-2">
                    <Download className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-foreground text-xs font-semibold">Instalar UniEspaços</span>
                    <span className="text-muted-foreground text-[11px]">Acesse em tela cheia na sua tela inicial</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={() => void promptInstall()} className="h-8 text-xs font-medium">
                    Instalar
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={dismissPrompt}
                    className="text-muted-foreground hover:text-foreground h-11 w-11 md:h-8 md:w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </aside>
    );
};

export default InstallPwaBanner;
