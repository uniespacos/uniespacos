<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Espaco;
use App\Models\User;
use App\Repositories\AgendaRepositoryInterface;
use App\Repositories\DashboardRepositoryInterface;

class HomeService
{
    private const LIMITE_RECENTES = 5;

    private const LIMITE_ESPACOS_RECENTES = 3;

    public function __construct(
        private DashboardRepositoryInterface $dashboard,
        private AgendaRepositoryInterface $agendas,
    ) {}

    /**
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
     * @return array<string, mixed>
     */
    private function getInstitucionalData(User $user): array
    {
        $reservas = $this->dashboard->reservasRecentesDoUsuario($user->id, self::LIMITE_RECENTES);
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();
        $users = $this->dashboard->ultimosUsuarios(self::LIMITE_RECENTES);
        $espacos = $this->dashboard->ultimosEspacosComAgendas(self::LIMITE_RECENTES);
        $gestores = $this->dashboard->ultimosGestores(self::LIMITE_RECENTES);
        $unidades = $this->dashboard->ultimasUnidadesComEspacos(self::LIMITE_RECENTES);

        $estatisticasPainel = [
            'total_espacos' => $this->dashboard->contarEspacos(),
            'total_gestores' => $this->dashboard->contarGestores(),
            'reservas_mes' => $this->dashboard->contarReservasCriadasEntre(now()->startOfMonth(), now()->endOfMonth()),
        ];

        return compact('reservas', 'espacosFavoritos', 'user', 'users', 'gestores', 'espacos', 'unidades', 'estatisticasPainel');
    }

    /**
     * @return array<string, mixed>
     */
    private function getGestorData(User $user): array
    {
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();
        $agendas = $this->agendas->getComEspacoDoUsuario($user->id);
        $reservasPendentes = $this->dashboard->reservasPendentesDoGestor($user->id, self::LIMITE_RECENTES);

        $statusDasReservas = [
            'pendentes' => $this->dashboard->contarReservasDoGestorPorSituacao($user->id, SituacaoReservaEnum::EM_ANALISE->value),
            'avaliadas_hoje' => $this->dashboard->contarReservasAvaliadasHojeDoGestor($user->id, today()),
            'total_espacos' => $this->dashboard->contarEspacosDoGestor($user->id),
        ];

        return compact('user', 'espacosFavoritos', 'agendas', 'reservasPendentes', 'statusDasReservas');
    }

    /**
     * @return array<string, mixed>
     */
    private function getUserData(User $user): array
    {
        $reservas = $this->dashboard->reservasRecentesDoUsuario($user->id, self::LIMITE_RECENTES);
        $espacosFavoritos = $user->favoritos()->with('andar.modulo')->get();

        $statusDasReservas = [
            'em_analise' => $this->dashboard->contarReservasDoUsuarioPorSituacao($user->id, SituacaoReservaEnum::EM_ANALISE->value),
            'parcialmente_deferida' => $this->dashboard->contarReservasDoUsuarioPorSituacao($user->id, SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value),
            'deferida' => $this->dashboard->contarReservasDoUsuarioPorSituacao($user->id, SituacaoReservaEnum::DEFERIDA->value),
            'indeferida' => $this->dashboard->contarReservasDoUsuarioPorSituacao($user->id, SituacaoReservaEnum::INDEFERIDA->value),
        ];

        $espacosRecentes = $this->espacosRecentesDoUsuario($user);

        return compact('user', 'espacosFavoritos', 'statusDasReservas', 'reservas', 'espacosRecentes');
    }

    /**
     * @return list<array{id: int, nome: string, andar: array{modulo: array{nome: string}}}>
     */
    private function espacosRecentesDoUsuario(User $user): array
    {
        $resultado = [];

        foreach ($this->dashboard->espacosRecentesDoUsuario($user->id, self::LIMITE_ESPACOS_RECENTES) as $espaco) {
            $resultado[] = $this->formatarEspacoRecente($espaco);
        }

        return $resultado;
    }

    /**
     * @return array{id: int, nome: string, andar: array{modulo: array{nome: string}}}
     */
    private function formatarEspacoRecente(Espaco $espaco): array
    {
        $modulo = $espaco->andar?->modulo;

        return [
            'id' => $espaco->id,
            'nome' => $espaco->nome,
            'andar' => [
                'modulo' => [
                    'nome' => $modulo !== null ? $modulo->nome : '',
                ],
            ],
        ];
    }
}
