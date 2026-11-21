<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\Unidade;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Collection;

class DashboardRepositoryEloquent implements DashboardRepositoryInterface
{
    private const PERMISSAO_GESTAO_RESERVAS = 'secao.gestao-reservas';

    public function contarEspacos(): int
    {
        return Espaco::count();
    }

    public function contarGestores(): int
    {
        return User::permission(self::PERMISSAO_GESTAO_RESERVAS)->count();
    }

    public function contarReservasCriadasEntre(CarbonInterface $inicio, CarbonInterface $fim): int
    {
        return Reserva::whereBetween('created_at', [$inicio, $fim])->count();
    }

    public function ultimosUsuarios(int $limite): Collection
    {
        return User::select(['id', 'name'])->latest()->take($limite)->get();
    }

    public function ultimosEspacosComAgendas(int $limite): Collection
    {
        return Espaco::latest()
            ->take($limite)
            ->with(['andar.modulo.unidade', 'agendas:id,espaco_id,turno,user_id', 'agendas.user:id,name'])
            ->get();
    }

    public function ultimosGestores(int $limite): Collection
    {
        return User::permission(self::PERMISSAO_GESTAO_RESERVAS)
            ->select(['id', 'name', 'email', 'setor_id'])
            ->with('setor:id,nome')
            ->latest()
            ->take($limite)
            ->get();
    }

    public function ultimasUnidadesComEspacos(int $limite): Collection
    {
        return Unidade::latest()->take($limite)->with('modulos.andars.espacos')->get();
    }

    public function reservasRecentesDoUsuario(int $userId, int $limite): Collection
    {
        return Reserva::select(['id', 'titulo', 'data_inicial', 'data_final', 'situacao', 'user_id'])
            ->where('user_id', $userId)
            ->where('situacao', '!=', SituacaoReservaEnum::INATIVA->value)
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
            ->take($limite)
            ->get();
    }

    public function contarReservasDoUsuarioPorSituacao(int $userId, string $situacao): int
    {
        return Reserva::where('user_id', $userId)->where('situacao', $situacao)->count();
    }

    public function espacosRecentesDoUsuario(int $userId, int $limite): Collection
    {
        return Espaco::query()
            ->select('espacos.id', 'espacos.nome', 'espacos.andar_id')
            ->join('agendas', 'agendas.espaco_id', '=', 'espacos.id')
            ->join('horarios', 'horarios.agenda_id', '=', 'agendas.id')
            ->join('reservas', 'reservas.id', '=', 'horarios.reserva_id')
            ->where('reservas.user_id', $userId)
            ->where('reservas.situacao', '!=', SituacaoReservaEnum::INATIVA->value)
            ->groupBy('espacos.id', 'espacos.nome', 'espacos.andar_id')
            ->orderByRaw('MAX(reservas.created_at) DESC')
            ->limit($limite)
            ->with(['andar:id,modulo_id', 'andar.modulo:id,nome'])
            ->get();
    }

    public function reservasPendentesDoGestor(int $userId, int $limite): Collection
    {
        $emAnalise = SituacaoReservaEnum::EM_ANALISE->value;

        return Reserva::select(['id', 'titulo', 'descricao', 'situacao', 'user_id'])
            ->whereHas('horarios.agenda', fn ($q) => $q->where('user_id', $userId))
            ->where(function ($query) use ($emAnalise) {
                $query->where('situacao', $emAnalise)
                    ->orWhereHas('horarios', fn ($q) => $q->where('situacao', $emAnalise));
            })
            ->with('user:id,name,setor_id', 'user.setor:id,nome')
            ->latest()
            ->take($limite)
            ->get();
    }

    public function contarReservasDoGestorPorSituacao(int $userId, string $situacao): int
    {
        return Reserva::whereHas('horarios.agenda', fn ($q) => $q->where('user_id', $userId))
            ->where('situacao', $situacao)
            ->count();
    }

    public function contarReservasAvaliadasHojeDoGestor(int $userId, CarbonInterface $hoje): int
    {
        return Reserva::whereHas('horarios.agenda', fn ($q) => $q->where('user_id', $userId))
            ->whereIn('situacao', [
                SituacaoReservaEnum::DEFERIDA->value,
                SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value,
                SituacaoReservaEnum::INDEFERIDA->value,
            ])
            ->whereDate('updated_at', $hoje)
            ->count();
    }

    public function contarEspacosDoGestor(int $userId): int
    {
        return Espaco::whereHas('agendas', fn ($q) => $q->where('user_id', $userId))->count();
    }
}
