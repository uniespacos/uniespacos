<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\Horario;
use Illuminate\Support\Collection as SupportCollection;

/**
 * @extends CrudRepositoryInterface<Horario>
 */
interface HorarioRepositoryInterface extends CrudRepositoryInterface
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
     * Horarios de uma reserva, indexados pelo id do horario, no formato aceito por conflitosDeferidos.
     *
     * @return SupportCollection<int, array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}>
     */
    public function linhasDaReserva(int $reservaId): SupportCollection;

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
}
