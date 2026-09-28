import {
    ModoArquivo,
    type ModoArquivoType,
    OrdenacaoReserva,
    type OrdenacaoReservaType,
    type SituacaoReservaType,
} from '@/contracts';
import { useDebounce } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

declare function route(name: string, params?: unknown): string;

const PROPS_DA_LISTAGEM = ['reservas', 'filters', 'reservaToShow', 'semana'];

export interface UseReservasFiltersProps {
    routeName: 'reservas.index' | 'gestor.reservas.index';
    initialFilters: {
        search?: string;
        situacao?: SituacaoReservaType | '';
        arquivo?: ModoArquivoType;
        ordenar?: OrdenacaoReservaType;
    };
    initialSemana: { referencia: string };
}

export function useReservasFilters({ routeName, initialFilters, initialSemana }: UseReservasFiltersProps) {
    const [searchTerm, setSearchTerm] = useState<string>(initialFilters.search ?? '');
    const [selectedSituacao, setSelectedSituacao] = useState<SituacaoReservaType | ''>(initialFilters.situacao ?? '');
    const [selectedArquivo, setSelectedArquivo] = useState<ModoArquivoType>(initialFilters.arquivo ?? ModoArquivo.ATIVAS);
    const [selectedOrdenar, setSelectedOrdenar] = useState<OrdenacaoReservaType>(
        initialFilters.ordenar ?? OrdenacaoReserva.DATA_SOLICITACAO,
    );
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(initialSemana.referencia + 'T12:00:00'));
    const debouncedSearch = useDebounce(searchTerm, 500);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const params: Record<string, string | undefined> = {
            search: debouncedSearch || undefined,
            situacao: selectedSituacao || undefined,
            arquivo: selectedArquivo !== ModoArquivo.ATIVAS ? selectedArquivo : undefined,
            ordenar: selectedOrdenar !== OrdenacaoReserva.DATA_SOLICITACAO ? selectedOrdenar : undefined,
            semana: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        };

        router.get(route(routeName), params, {
            only: PROPS_DA_LISTAGEM,
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }, [debouncedSearch, selectedSituacao, selectedArquivo, selectedOrdenar, selectedDate, routeName]);

    return {
        searchTerm,
        setSearchTerm,
        selectedSituacao,
        setSelectedSituacao,
        selectedArquivo,
        setSelectedArquivo,
        selectedOrdenar,
        setSelectedOrdenar,
        selectedDate,
        setSelectedDate,
    };
}
