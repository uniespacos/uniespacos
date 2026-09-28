import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import { Link } from '@inertiajs/react';
import { CalendarX, PlusCircle } from 'lucide-react';

declare function route(name: string, params?: unknown): string;

export function ReservasEmpty({ isGestor = false }: { isGestor?: boolean }) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-muted mb-4 rounded-full p-6">
                <CalendarX className="text-muted-foreground h-10 w-10" />
            </div>
            <h3 className="text-lg font-semibold">{t('reservas.empty.title')}</h3>
            <p className="text-muted-foreground mt-2 mb-6 max-w-md">
                {isGestor ? t('reservas.empty.gestor_desc') : t('reservas.empty.user_desc')}
            </p>
            {!isGestor && (
                <Button asChild>
                    <Link href={route('espacos.index')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        {t('reservas.empty.consultar_espacos')}
                    </Link>
                </Button>
            )}
        </div>
    );
}
