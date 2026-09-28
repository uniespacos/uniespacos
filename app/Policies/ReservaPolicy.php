<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Reserva;
use App\Models\User;

class ReservaPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('reservas.listar');
    }

    /**
     * Determine whether the user can view the model.
     *
     * ATENÇÃO: este método é a única barreira contra IDOR nas rotas
     * reservas.index (?reserva=), reservas.show e reservas.edit. A permission
     * 'reservas.visualizar' é intencional: o papel 'institucional' depende dela
     * para visualizar reservas de terceiros. Não reduzir para apenas user_id.
     */
    public function view(User $user, Reserva $reserva): bool
    {
        return $user->hasPermissionTo('reservas.visualizar') || $user->id === $reserva->user_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     * Allowed only for the reservation owner while the situacao is 'em_analise'
     * and no horarios have been individually evaluated yet, or if user has update permission.
     */
    public function update(User $user, Reserva $reserva): bool
    {
        if ($user->hasPermissionTo('reservas.atualizar')) {
            return true;
        }

        if ($user->id !== $reserva->user_id || $reserva->situacao !== SituacaoReservaEnum::EM_ANALISE->value) {
            return false;
        }

        $hasProcessedSlots = $reserva->horarios()
            ->whereIn('situacao', [SituacaoReservaEnum::DEFERIDA->value, SituacaoReservaEnum::INDEFERIDA->value])
            ->exists();

        return ! $hasProcessedSlots;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Reserva $reserva): bool
    {
        return $user->hasPermissionTo('reservas.deletar') || $user->id === $reserva->user_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Reserva $reserva): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Reserva $reserva): bool
    {
        return false;
    }

    /**
     * Determine whether a gestor can view the reservation for evaluation.
     * Requires the user to have reservas.avaliar permission or manage at least one agenda associated with the reservation.
     */
    public function viewForGestor(User $user, Reserva $reserva): bool
    {
        if (! $user->hasPermissionTo('reservas.avaliar')) {
            return false;
        }

        if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            return false;
        }

        $agendasDaReservaIds = $reserva->horarios()->pluck('agenda_id')->unique();
        $agendasDoGestorIds = $user->agendas()->pluck('id');

        return $agendasDoGestorIds->intersect($agendasDaReservaIds)->isNotEmpty();
    }
}
