<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\Unidade;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class HomeService
{
    /**
     * Returns the dashboard data array for the given user based on their permission type.
     *
     * @return array<string, mixed>
     */
    public function getDashboardData(User $user): array
    {
        if ($user->hasPermissionTo('secao.dashboard-institucional')) {
            return $this->getInstitucionalData($user);
        } elseif ($user->hasPermissionTo('secao.dashboard-gestor')) {
            return $this->getGestorData($user);
        }

        return $this->getUserData($user);
    }

    /**
     * Returns dashboard data for an institucional (admin) user.
     *
     * @return array<string, mixed>
     */
    private function getInstitucionalData(User $user): array
    {
        $reservas = $this->buildRecentReservasQuery($user)->get();
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();
        $users = User::latest()->take(5)->with(['agendas'])->get();
        $espacos = Espaco::latest()->take(5)->with(['andar.modulo.unidade', 'agendas.user'])->get();
        $gestores = User::permission('secao.gestao-reservas')->latest()->take(5)->get();
        $unidades = Unidade::latest()->take(5)->with('modulos.andars.espacos')->get();

        $estatisticasPainel = [
            'total_espacos' => Espaco::count(),
            'total_gestores' => User::permission('secao.gestao-reservas')->count(),
            'reservas_mes' => Reserva::whereMonth('created_at', now()->month)->count(),
        ];

        return compact('reservas', 'espacosFavoritos', 'user', 'users', 'gestores', 'espacos', 'unidades', 'estatisticasPainel');
    }

    /**
     * Returns dashboard data for a gestor user.
     *
     * @return array<string, mixed>
     */
    private function getGestorData(User $user): array
    {
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();
        $agendas = Agenda::whereUserId($user->id)->with(['espaco.andar.modulo.unidade'])->get();

        $reservasPendentes = Reserva::select(['id', 'titulo', 'descricao', 'situacao', 'user_id'])
            ->whereHas('horarios.agenda', fn ($q) => $q->where('user_id', $user->id))
            ->where(function ($query) {
                $query->where('situacao', 'em_analise')
                    ->orWhereHas('horarios', fn ($q) => $q->where('situacao', 'em_analise'));
            })
            ->with('user:id,name,setor_id', 'user.setor:id,nome')
            ->latest()
            ->take(5)
            ->get();

        $baseStats = Reserva::whereHas('horarios.agenda', fn ($q) => $q->where('user_id', $user->id));

        $statusDasReservas = [
            'pendentes' => (clone $baseStats)->where('situacao', 'em_analise')->count(),
            'avaliadas_hoje' => (clone $baseStats)
                ->whereIn('situacao', ['deferida', 'parcialmente_deferida', 'indeferida'])
                ->whereDate('updated_at', today())
                ->count(),
            'total_espacos' => Espaco::whereHas('agendas', fn ($q) => $q->where('user_id', $user->id))->count(),
        ];

        return compact('user', 'espacosFavoritos', 'agendas', 'reservasPendentes', 'statusDasReservas');
    }

    /**
     * Returns dashboard data for a common user.
     *
     * @return array<string, mixed>
     */
    private function getUserData(User $user): array
    {
        $reservas = $this->buildRecentReservasQuery($user)->get();
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();

        $base = Reserva::where('user_id', $user->id);

        $statusDasReservas = [
            'em_analise' => (clone $base)->where('situacao', 'em_analise')->count(),
            'parcialmente_deferida' => (clone $base)->where('situacao', 'parcialmente_deferida')->count(),
            'deferida' => (clone $base)->where('situacao', 'deferida')->count(),
            'indeferida' => (clone $base)->where('situacao', 'indeferida')->count(),
        ];

        return compact('user', 'espacosFavoritos', 'statusDasReservas', 'reservas');
    }

    /**
     * Builds the shared recent reservations query (last 5, excluding inactive).
     *
     * @return Builder
     */
    private function buildRecentReservasQuery(User $user)
    {
        return Reserva::select(['id', 'titulo', 'data_inicial', 'data_final', 'situacao', 'user_id'])
            ->where('user_id', $user->id)
            ->where('situacao', '!=', 'inativa')
            ->with([
                'horarios' => function ($query) {
                    $query->limit(1)
                        ->select('id', 'reserva_id', 'agenda_id')
                        ->with([
                            'agenda:id,espaco_id',
                            'agenda.espaco:id,nome,andar_id',
                            'agenda.espaco.andar:id,nome,modulo_id',
                            'agenda.espaco.andar.modulo:id,nome',
                        ]);
                },
            ])
            ->latest()
            ->take(5);
    }
}
