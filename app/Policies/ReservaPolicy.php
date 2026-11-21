<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Reserva;
use App\Models\User;

class ReservaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('reservas.listar');
    }

    /**
     * ATENÇÃO: este método é a única barreira contra IDOR nas rotas
     * reservas.index (?reserva=), reservas.show e reservas.edit. A permission
     * 'reservas.visualizar' é intencional: o papel 'institucional' depende dela
     * para visualizar reservas de terceiros. Não reduzir para apenas user_id.
     */
    public function view(User $user, Reserva $reserva): bool
    {
        return $user->hasPermissionTo('reservas.visualizar') || $user->id === $reserva->user_id;
    }

    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Dono com a reserva ainda em análise e sem horário avaliado, ou quem tem reservas.atualizar.
     * Listagens carregam `possui_horario_avaliado` via withExists para evitar uma consulta por item.
     */
    public function update(User $user, Reserva $reserva): bool
    {
        if ($user->hasPermissionTo('reservas.atualizar')) {
            return true;
        }

        if ($user->id !== $reserva->user_id || $reserva->situacao !== SituacaoReservaEnum::EM_ANALISE->value) {
            return false;
        }

        return ! $this->possuiHorarioAvaliado($reserva);
    }

    public function delete(User $user, Reserva $reserva): bool
    {
        return $user->hasPermissionTo('reservas.deletar') || $user->id === $reserva->user_id;
    }

    public function restore(User $user, Reserva $reserva): bool
    {
        return false;
    }

    public function forceDelete(User $user, Reserva $reserva): bool
    {
        return false;
    }

    /**
     * Exige reservas.avaliar e ao menos uma agenda da reserva gerenciada pelo gestor.
     */
    public function viewForGestor(User $user, Reserva $reserva): bool
    {
        if (! $user->hasPermissionTo('reservas.avaliar')) {
            return false;
        }

        $agendasDaReservaIds = $reserva->horarios()->pluck('agenda_id')->unique();
        $agendasDoGestorIds = $user->agendas()->pluck('id');

        return $agendasDoGestorIds->intersect($agendasDaReservaIds)->isNotEmpty();
    }

    /**
     * Reservas arquivadas ('inativa') são terminais e não podem ser avaliadas.
     */
    public function evaluateForGestor(User $user, Reserva $reserva): bool
    {
        if ($reserva->situacao === SituacaoReservaEnum::INATIVA->value) {
            return false;
        }

        return $this->viewForGestor($user, $reserva);
    }

    private function possuiHorarioAvaliado(Reserva $reserva): bool
    {
        if (array_key_exists('possui_horario_avaliado', $reserva->getAttributes())) {
            return (bool) $reserva->getAttribute('possui_horario_avaliado');
        }

        return $reserva->horarios()
            ->whereIn('situacao', [SituacaoReservaEnum::DEFERIDA->value, SituacaoReservaEnum::INDEFERIDA->value])
            ->exists();
    }
}
