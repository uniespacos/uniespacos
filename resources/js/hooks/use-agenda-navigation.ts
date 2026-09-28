import { router } from '@inertiajs/react';
import { addWeeks, endOfWeek, format, isAfter, isBefore, startOfWeek, subWeeks } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';

interface UseAgendaNavigationProps {
    semanaInicial: Date;
    routeName: string;
    routeParams?: Record<string, unknown>;
    dataInicial?: Date;
    dataFinal?: Date;
}

export function useAgendaNavigation({ semanaInicial, routeName, routeParams = {}, dataInicial, dataFinal }: UseAgendaNavigationProps) {
    const [semanaVisivel, setSemanaVisivel] = useState<Date>(semanaInicial);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        setSemanaVisivel(semanaInicial);
    }, [semanaInicial]);

    const podeVoltar = useMemo(() => {
        if (!dataInicial) return true;
        return isAfter(startOfWeek(semanaVisivel, { weekStartsOn: 1 }), dataInicial);
    }, [semanaVisivel, dataInicial]);

    const podeAvancar = useMemo(() => {
        if (!dataFinal) return true;
        return isBefore(endOfWeek(semanaVisivel, { weekStartsOn: 1 }), dataFinal);
    }, [semanaVisivel, dataFinal]);

    const navegarParaSemana = (novaData: Date) => {
        router.get(
            route(routeName, routeParams),
            { semana: format(novaData, 'yyyy-MM-dd') },
            {
                only: ['espaco', 'semana'],
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => {
                    setIsLoading(true);
                },
                onFinish: () => {
                    setIsLoading(false);
                },
            },
        );
    };

    const irParaSemanaAnterior = () => {
        if (podeVoltar) {
            navegarParaSemana(subWeeks(semanaVisivel, 1));
        }
    };

    const irParaProximaSemana = () => {
        if (podeAvancar) {
            navegarParaSemana(addWeeks(semanaVisivel, 1));
        }
    };

    const irParaSemanaAtual = () => {
        const hoje = new Date(new Date().setHours(0, 0, 0, 0));
        navegarParaSemana(hoje);
    };

    return {
        semanaVisivel,
        isLoading,
        podeVoltar,
        podeAvancar,
        irParaSemanaAnterior,
        irParaProximaSemana,
        irParaSemanaAtual,
    };
}
