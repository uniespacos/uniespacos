<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\Unidade;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

interface DashboardRepositoryInterface
{
    public function contarEspacos(): int;

    public function contarGestores(): int;

    public function contarReservasCriadasEntre(CarbonInterface $inicio, CarbonInterface $fim): int;

    /**
     * @return Collection<int, User>
     */
    public function ultimosUsuarios(int $limite): Collection;

    /**
     * @return Collection<int, Espaco>
     */
    public function ultimosEspacosComAgendas(int $limite): Collection;

    /**
     * @return Collection<int, User>
     */
    public function ultimosGestores(int $limite): Collection;

    /**
     * @return Collection<int, Unidade>
     */
    public function ultimasUnidadesComEspacos(int $limite): Collection;

    /**
     * @return Collection<int, Reserva>
     */
    public function reservasRecentesDoUsuario(int $userId, int $limite): Collection;

    public function contarReservasDoUsuarioPorSituacao(int $userId, string $situacao): int;

    /**
     * @return Collection<int, Espaco>
     */
    public function espacosRecentesDoUsuario(int $userId, int $limite): Collection;

    /**
     * @return Collection<int, Reserva>
     */
    public function reservasPendentesDoGestor(int $userId, int $limite): Collection;

    public function contarReservasDoGestorPorSituacao(int $userId, string $situacao): int;

    public function contarReservasAvaliadasHojeDoGestor(int $userId, CarbonInterface $hoje): int;

    public function contarEspacosDoGestor(int $userId): int;
}
