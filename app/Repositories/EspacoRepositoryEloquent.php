<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Espaco;
use App\Support\SemanaDeReferencia;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection as SupportCollection;
use Illuminate\Support\Facades\DB;

class EspacoRepositoryEloquent implements EspacoRepositoryInterface
{
    public function __construct(
        protected Espaco $espaco,
    ) {}

    public function store(array $data): Espaco
    {
        return $this->espaco->create($data);
    }

    /**
     * Returns all instances of Espaco from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Espaco>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->espaco->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns a paginated list of Espaco for the public listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator
    {
        $query = $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId));

        $disponibilidade = $this->disponibilidadeSolicitada($filters);

        if ($disponibilidade !== null) {
            $query->whereRaw(
                'EXISTS (SELECT 1 FROM ('.$disponibilidade['sql'].') AS livres WHERE livres.espaco_id = espacos.id)',
                $disponibilidade['bindings'],
            );
        }

        $paginator = $this->applyFilters($query, $filters)
            ->with([
                'andar:id,nome,modulo_id',
                'andar.modulo:id,nome,unidade_id',
                'andar.modulo.unidade:id,sigla',
            ])
            ->latest()
            ->paginate($perPage);

        if ($disponibilidade !== null) {
            $this->anexarHorariosLivres($paginator, $disponibilidade);
        }

        return $paginator;
    }

    /**
     * Monta a consulta de slots livres (uma linha por slot da grade livre) para a data
     * e turno pedidos. Retorna null quando a listagem nao pediu data.
     *
     * Slot livre: slot da grade do turno em agenda com gestor, sem horario deferido
     * na mesma data com o mesmo horario_inicio. Em hoje, slots que ja comecaram nao contam.
     *
     * @param  array<string, mixed>  $filters
     * @return array{sql: string, bindings: list<mixed>}|null
     */
    private function disponibilidadeSolicitada(array $filters): ?array
    {
        $data = $filters['data'] ?? null;

        if (! is_string($data) || $data === '') {
            return null;
        }

        $fusoConfig = config('reservas.fuso_horario');
        $fuso = is_string($fusoConfig) && $fusoConfig !== '' ? $fusoConfig : 'America/Bahia';
        $agora = Carbon::now($fuso);

        $horariosConfig = config('reservas.horarios_por_turno');
        $horariosPorTurno = is_array($horariosConfig) ? $horariosConfig : [];
        $turno = $filters['turno'] ?? null;
        $turnos = is_string($turno) && $turno !== '' ? [$turno] : array_keys($horariosPorTurno);

        $grade = [];
        foreach ($turnos as $turnoGrade) {
            if (! is_string($turnoGrade)) {
                continue;
            }
            $faixas = $horariosPorTurno[$turnoGrade] ?? [];
            if (! is_array($faixas)) {
                continue;
            }
            foreach ($faixas as $faixa) {
                if (! is_string($faixa)) {
                    continue;
                }
                $grade[] = [$turnoGrade, trim(explode('-', $faixa)[0])];
            }
        }

        if ($grade === []) {
            return ['sql' => 'SELECT NULL::integer AS espaco_id WHERE FALSE', 'bindings' => []];
        }

        $valores = implode(', ', array_fill(0, count($grade), '(?, CAST(? AS time))'));
        $bindings = [];
        foreach ($grade as [$turnoGrade, $inicio]) {
            $bindings[] = $turnoGrade;
            $bindings[] = $inicio;
        }

        $filtroHoje = '';
        $bindings[] = $data;
        $bindings[] = SituacaoReservaEnum::DEFERIDA->value;

        if ($data === $agora->toDateString()) {
            $filtroHoje = ' AND grade.inicio > CAST(? AS time)';
            $bindings[] = $agora->format('H:i:s');
        }

        $sql = 'SELECT a.espaco_id, a.id AS agenda_id, grade.inicio '
            .'FROM agendas a '
            ."JOIN (VALUES {$valores}) AS grade (turno, inicio) ON grade.turno = a.turno "
            .'WHERE a.user_id IS NOT NULL '
            .'AND NOT EXISTS (SELECT 1 FROM horarios h WHERE h.agenda_id = a.id AND h.data = ? AND h.situacao = ? AND h.horario_inicio = grade.inicio)'
            .$filtroHoje;

        return ['sql' => $sql, 'bindings' => $bindings];
    }

    /**
     * Anexa `horarios_livres` a cada espaco da pagina com uma unica consulta agrupada.
     *
     * @param  LengthAwarePaginator<int, Model>  $paginator
     * @param  array{sql: string, bindings: list<mixed>}  $disponibilidade
     */
    private function anexarHorariosLivres(LengthAwarePaginator $paginator, array $disponibilidade): void
    {
        $itens = array_values(array_filter(
            $paginator->items(),
            static fn (mixed $item): bool => $item instanceof Espaco,
        ));

        $ids = array_map(static fn (Espaco $espaco): int => (int) $espaco->id, $itens);

        $totais = [];
        if ($ids !== []) {
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));
            $linhas = DB::select(
                "SELECT livres.espaco_id, COUNT(*) AS total FROM ({$disponibilidade['sql']}) AS livres WHERE livres.espaco_id IN ({$placeholders}) GROUP BY livres.espaco_id",
                [...$disponibilidade['bindings'], ...$ids],
            );

            foreach ($linhas as $linha) {
                $totais[(int) $linha->espaco_id] = (int) $linha->total;
            }
        }

        foreach ($itens as $espaco) {
            $espaco->setAttribute('horarios_livres', $totais[(int) $espaco->id] ?? 0);
        }
    }

    /**
     * Returns a paginated list of Espaco for the admin listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator
    {
        $query = $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId));

        return $this->applyFilters($query, $filters)
            ->with(['andar.modulo.unidade.instituicao', 'agendas:id,espaco_id,turno,user_id', 'agendas.user:id,name,profile_pic'])
            ->latest()
            ->paginate($perPage);
    }

    /**
     * Applies the shared search/unidade/modulo/andar/capacidade filters to a Espaco query
     *
     * @param  array<string, mixed>  $filters
     */
    private function applyFilters(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('nome', 'like', '%'.$search.'%')
                        ->orWhereHas('andar', fn ($q) => $q->where('nome', 'like', '%'.$search.'%'))
                        ->orWhereHas('andar.modulo', fn ($q) => $q->where('nome', 'like', '%'.$search.'%'));
                });
            })
            ->when($filters['unidade'] ?? null, fn ($q, $unidade) => $q->whereHas('andar.modulo', fn ($q) => $q->where('unidade_id', $unidade)))
            ->when($filters['modulo'] ?? null, fn ($q, $modulo) => $q->whereHas('andar', fn ($q) => $q->where('modulo_id', $modulo)))
            ->when($filters['andar'] ?? null, fn ($q, $andar) => $q->where('andar_id', $andar))
            ->when($filters['capacidade'] ?? null, fn ($q, $capacidade) => $q->where('capacidade_pessoas', '>=', $capacidade));
    }

    /**
     * Returns distinct capacidade_pessoas values for spaces in the given institution
     *
     * @return SupportCollection<int, int>
     */
    public function getDistinctCapacidadesByInstituicao(int $instituicaoId): SupportCollection
    {
        return $this->espaco->newQuery()
            ->whereHas('andar.modulo.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->select('capacidade_pessoas')
            ->distinct()
            ->orderBy('capacidade_pessoas')
            ->pluck('capacidade_pessoas');
    }

    public function carregarAgendaDaSemana(Espaco $espaco, SemanaDeReferencia $semana, ?string $horizonteFim = null): Espaco
    {
        $inicio = $semana->inicio;
        $horizonte = $horizonteFim ?? $semana->horizonteDeConflito();

        return $espaco->load([
            'andar.modulo.unidade.instituicao',
            'agendas' => function ($query) use ($inicio, $horizonte) {
                $query->with([
                    'user:id,name,email,setor_id',
                    'user.setor:id,nome,sigla',
                    'horarios' => function ($q) use ($inicio, $horizonte) {
                        $q->where('situacao', SituacaoReservaEnum::DEFERIDA->value)
                            ->whereBetween('data', [$inicio, $horizonte])
                            ->with([
                                'reserva:id,titulo,situacao,observacao,user_id',
                                'reserva.user:id,name,setor_id',
                                'reserva.user.setor:id,nome,sigla',
                                'avaliador:id,name',
                            ]);
                    },
                ]);
            },
        ]);
    }

    public function get(int|string $id): ?Espaco
    {
        return $this->espaco->find($id);
    }

    public function update(array $data, int|string $id): Espaco
    {
        $espaco = $this->espaco->findOrFail($id);
        $espaco->update($data);

        return $espaco;
    }

    public function destroy(int|string $id): bool
    {
        return (bool) $this->espaco->findOrFail($id)->delete();
    }
}
