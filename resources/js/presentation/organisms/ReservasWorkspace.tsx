import { type ModoArquivoType, type OrdenacaoReservaType, type SituacaoReservaType } from '@/contracts';
import { useIsMobile } from '@/hooks/use-mobile';
import { useReservaRefreshOnEvent } from '@/hooks/use-reserva-refresh-on-event';
import { useReservasFilters } from '@/hooks/use-reservas-filters';
import { useReservationLiveUpdates } from '@/hooks/use-reservation-live-updates';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { ReservasEmpty } from '@/presentation/molecules/ReservasEmpty';
import { ReservasFilters } from '@/presentation/molecules/ReservasFilters';
import { type ViewMode } from '@/presentation/molecules/ViewModeToggle';
import { ReservasList } from '@/presentation/organisms/ReservasList';
import { type Paginator, type Reserva, type User } from '@/types';
import { type LucideIcon } from 'lucide-react';
import { useState } from 'react';

export interface ReservasFilterQuery {
    search?: string;
    situacao?: SituacaoReservaType | '';
    arquivo?: ModoArquivoType;
    ordenar?: OrdenacaoReservaType;
}

interface ReservasWorkspaceProps {
    title: string;
    description: string;
    routeName: 'reservas.index' | 'gestor.reservas.index';
    isGestor: boolean;
    paginator: Paginator<Reserva>;
    filters: ReservasFilterQuery;
    user: User;
    reservaToShow?: Reserva;
    headerIcon: LucideIcon;
    headerButtonText?: string;
    headerButtonLink?: string;
}

export function ReservasWorkspace({
    title,
    description,
    routeName,
    isGestor,
    paginator,
    filters,
    user,
    reservaToShow,
    headerIcon,
    headerButtonText,
    headerButtonLink,
}: ReservasWorkspaceProps) {
    const isMobile = useIsMobile();
    const [viewMode, setViewMode] = useState<ViewMode>(isMobile ? 'grid' : 'table');

    useReservationLiveUpdates();
    useReservaRefreshOnEvent({ only: ['reservas', 'filters', 'reservaToShow'] });

    const {
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
    } = useReservasFilters({
        routeName,
        initialFilters: filters,
    });

    return (
        <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
            <GenericHeader
                titulo={title}
                descricao={description}
                canSeeButton={Boolean(headerButtonText && headerButtonLink)}
                buttonText={headerButtonText}
                buttonLink={headerButtonLink}
                ButtonIcon={headerIcon}
            />
            <ReservasFilters
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                selectedSituacao={selectedSituacao}
                onSituacaoChange={setSelectedSituacao}
                selectedArquivo={selectedArquivo}
                onArquivoChange={setSelectedArquivo}
                selectedOrdenar={selectedOrdenar}
                onOrdenarChange={setSelectedOrdenar}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
            />
            <ReservasList
                fallback={<ReservasEmpty isGestor={isGestor} />}
                paginator={paginator}
                isGestor={isGestor}
                user={user}
                reservaToShow={reservaToShow}
                routeName={routeName}
                viewMode={viewMode}
            />
        </div>
    );
}
