<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Horario;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Collection as SupportCollection;

interface HorarioRepositoryInterface
{
    public function __construct(Horario $horario);

    /**
     * Conflitos com horarios deferidos de outras reservas, uma query para o lote inteiro.
     *
     * Sobreposicao estrita: inicio_existente < fim_novo AND fim_existente > inicio_novo.
     * Intervalos encostados (09-10 e 10-11) nao conflitam.
     *
     * @param  array<array-key, array<string, mixed>>  $linhas
     * @return SupportCollection<array-key, array{
     *     linha: array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string},
     *     conflito: array{reserva_id: int, reserva_titulo: string, data: string, horario_inicio: string, horario_fim: string}
     * }> Indexada pela chave de $linhas; so contem as linhas que conflitam.
     */
    public function conflitosDeferidos(array $linhas, ?int $ignorarReservaId = null): SupportCollection;

    /**
     * Atualiza numa unica query os horarios da reserva que estao nas agendas informadas.
     *
     * @param  list<int>  $horarioIds
     * @param  list<int>  $agendaIds
     * @param  array<string, mixed>  $atributos
     */
    public function atualizarDaReservaEmLote(array $horarioIds, int $reservaId, array $agendaIds, array $atributos): int;

    /**
     * Trava (SELECT ... FOR UPDATE) os horarios das agendas no periodo. Exige transacao aberta.
     *
     * @param  list<int>  $agendaIds
     */
    public function bloquearPeriodo(array $agendaIds, string $dataInicial, string $dataFinal): void;

    /**
     * Stores a new instance of Horario in the database
     */
    public function store(array $data): Horario;

    /**
     * Returns all instances of Horario from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, Horario>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection;

    /**
     * Returns an instance of Horario from the given id
     */
    public function get(int|string $id): ?Horario;

    /**
     * Updates the data of an instance of Horario
     */
    public function update(array $data, int|string $id): Horario;

    /**
     * Removes an instance of Horario from the database
     */
    public function destroy(int|string $id): bool;
}
