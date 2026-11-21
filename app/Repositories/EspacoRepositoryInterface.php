<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Espaco;
use App\Support\SemanaDeReferencia;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

/**
 * @extends CrudRepositoryInterface<Espaco>
 */
interface EspacoRepositoryInterface extends CrudRepositoryInterface
{
    public function __construct(Espaco $espaco);

    /**
     * Returns a paginated list of Espaco for the public listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForPublic(int $instituicaoId, array $filters = [], int $perPage = 6): LengthAwarePaginator;

    /**
     * Returns a paginated list of Espaco for the admin listing, scoped to an institution with optional filters
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedForAdmin(int $instituicaoId, array $filters = [], int $perPage = 10): LengthAwarePaginator;

    /**
     * Returns distinct capacidade_pessoas values for spaces in the given institution
     *
     * @return SupportCollection<int, int>
     */
    public function getDistinctCapacidadesByInstituicao(int $instituicaoId): SupportCollection;

    public function contarDaInstituicao(?int $instituicaoId): int;

    /**
     * @param  array<mixed>|null  $agendaIds
     * @return Collection<int, Espaco>
     */
    public function listarParaInventario(?array $agendaIds, ?int $instituicaoId, ?int $unidadeId, ?int $moduloId, ?int $andarId, ?int $espacoId): Collection;

    /**
     * @param  array<int|string>  $ids
     * @return Collection<int, Espaco>
     */
    public function getComLocalizacaoPorIds(array $ids): Collection;

    /**
     * Carrega o espaço com a agenda da semana: horários deferidos entre o início da
     * semana e o horizonte de conflito.
     */
    public function carregarAgendaDaSemana(Espaco $espaco, SemanaDeReferencia $semana, ?string $horizonteFim = null): Espaco;

    /**
     * @param  array<mixed>|null  $agendaIds
     * @return Collection<int, Espaco>
     */
    public function listarComLocalizacaoParaOpcoes(?int $instituicaoId, ?array $agendaIds): Collection;

    public function encontrarPorReservaOuFalhar(int $reservaId): Espaco;
}
