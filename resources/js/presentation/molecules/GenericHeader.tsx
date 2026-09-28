import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';

interface HeaderEspacoProps {
    titulo: string;
    descricao: string;
    canSeeButton?: boolean;
    buttonText?: string;
    ButtonIcon?: React.ComponentType<{ className?: string }>;
    buttonLink?: string;
    buttonOnClick?: () => void;
    /** Selo curto ao lado do título — ex.: "Modo gestor", para distinguir
     *  telas que só o gestor vê (Gerir Reservas) das que ele compartilha
     *  com o usuário comum (Minhas Reservas), quase idênticas em layout. */
    badge?: string;
    BadgeIcon?: React.ComponentType<{ className?: string }>;
}

export default function GenericHeader({
    canSeeButton,
    titulo,
    descricao,
    ButtonIcon,
    buttonText,
    buttonLink,
    buttonOnClick,
    badge,
    BadgeIcon,
}: HeaderEspacoProps) {
    const handleOnClick = useCallback(() => {
        if (buttonOnClick) {
            buttonOnClick();
        }
        if (buttonLink) {
            router.get(buttonLink);
        }
    }, [buttonLink, buttonOnClick]);

    return (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
                    {badge && (
                        <Badge variant="secondary" className="text-primary bg-primary/10">
                            {BadgeIcon && <BadgeIcon className="h-3 w-3" />}
                            {badge}
                        </Badge>
                    )}
                </div>
                <p className="text-muted-foreground">{descricao}</p>
            </div>
            {canSeeButton && (
                <Button className="flex items-center gap-2" onClick={handleOnClick}>
                    {ButtonIcon && <ButtonIcon className="h-4 w-4" />}
                    {buttonText || 'N/A'}
                </Button>
            )}
        </header>
    );
}
