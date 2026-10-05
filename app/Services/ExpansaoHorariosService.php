<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Agenda;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Traduz os slots enviados pelo frontend nas linhas de `horarios` a inserir.
 *
 * Existe para que criacao e edicao de reserva compartilhem exatamente a mesma
 * regra de expansao: era a divergencia entre as duas que gerava a duplicacao
 * combinatoria (cada item do payload expandia de novo ate `data_final`, logo a
 * data da semana k era inserida k vezes).
 */
class ExpansaoHorariosService
{
    /**
     * @param  array<int, array<string, mixed>>  $slots  Itens de `horarios_solicitados`.
     * @param  Collection<int, Agenda>  $agendasMap  Agendas pre-carregadas, chaveadas por id.
     * @param  callable(Agenda): (string|array{situacao: string, user_id: ?int})  $resolverSituacao  Decide a situacao inicial de cada linha. Pode retornar string (legado) ou array com situacao e user_id.
     * @return array{0: array<int, array<string, mixed>>, 1: Collection<int, Agenda>}
     *                                                                                Linhas prontas para insert em lote e as agendas efetivamente usadas.
     */
    public function montar(
        array $slots,
        Collection $agendasMap,
        string $recorrencia,
        CarbonInterface $dataFinal,
        int $reservaId,
        callable $resolverSituacao,
    ): array {
        return $recorrencia === 'unica'
            ? $this->semExpansao($slots, $agendasMap, $reservaId, $resolverSituacao)
            : $this->expandindoSemanalmente($slots, $agendasMap, $dataFinal, $reservaId, $resolverSituacao);
    }

    /**
     * Recorrencia `unica` significa "apenas esta semana": grava exatamente as
     * datas recebidas, sem repetir nada. Suporta selecao avulsa em semanas
     * descontinuas — nenhuma data intermediaria e inventada.
     *
     * @param  array<int, array<string, mixed>>  $slots
     * @param  Collection<int, Agenda>  $agendasMap
     * @param  callable(Agenda): (string|array{situacao: string, user_id: ?int})  $resolverSituacao
     * @return array{0: array<int, array<string, mixed>>, 1: Collection<int, Agenda>}
     */
    private function semExpansao(array $slots, Collection $agendasMap, int $reservaId, callable $resolverSituacao): array
    {
        $linhas = [];
        $agendasUsadas = collect();
        $unicos = collect($slots)->unique(
            fn (array $slot) => $this->chaveSlot($slot)
        );

        foreach ($unicos as $slot) {
            $agenda = $agendasMap->get($slot['agenda_id']);

            if (! $agenda instanceof Agenda) {
                continue;
            }

            $agendasUsadas->push($agenda);
            $resultado = $resolverSituacao($agenda);
            [$situacao, $userId] = $this->normalizarResultado($resultado);
            $linhas[] = $this->linha($slot, (string) $slot['data'], $reservaId, $situacao, $userId);
        }

        return [$linhas, $agendasUsadas->unique('id')->values()];
    }

    /**
     * Demais recorrencias sao periodo, nao frequencia (`1mes` = "replicada por
     * um mes"), entao cada padrao se repete SEMANALMENTE ate `data_final`.
     *
     * Cada padrao e ancorado na sua propria menor data selecionada. Ancorar em
     * `data_inicial` da reserva — que pertence ao padrao mais antigo — criaria
     * ocorrencias que o usuario nao pediu para os demais padroes.
     *
     * @param  array<int, array<string, mixed>>  $slots
     * @param  Collection<int, Agenda>  $agendasMap
     * @param  callable(Agenda): (string|array{situacao: string, user_id: ?int})  $resolverSituacao
     * @return array{0: array<int, array<string, mixed>>, 1: Collection<int, Agenda>}
     */
    private function expandindoSemanalmente(
        array $slots,
        Collection $agendasMap,
        CarbonInterface $dataFinal,
        int $reservaId,
        callable $resolverSituacao,
    ): array {
        $linhas = [];
        $agendasUsadas = collect();

        $padroes = collect($slots)->groupBy(
            fn (array $slot) => $this->chavePadrao($slot)
        );

        foreach ($padroes as $grupo) {
            /** @var array<string, mixed> $base */
            $base = $grupo->first();
            $agenda = $agendasMap->get($base['agenda_id']);

            if (! $agenda instanceof Agenda) {
                continue;
            }

            $agendasUsadas->push($agenda);
            $resultado = $resolverSituacao($agenda);
            [$situacao, $userId] = $this->normalizarResultado($resultado);

            $cursor = $grupo
                ->map(fn (array $slot) => Carbon::parse($slot['data'])->startOfDay())
                ->sort()
                ->first();

            while ($cursor->lte($dataFinal)) {
                $linhas[] = $this->linha($base, $cursor->toDateString(), $reservaId, $situacao, $userId);
                $cursor = $cursor->copy()->addWeek();
            }
        }

        return [$linhas, $agendasUsadas->unique('id')->values()];
    }

    /**
     * Monta uma linha pronta para insert em lote da tabela horarios.
     *
     * ARMADILHA: `Horario::insert()` em lote monta a lista de colunas a partir
     * da PRIMEIRA linha; se as linhas tiverem conjuntos de chaves diferentes, os
     * valores entram em coluna trocada — por isso `justificativa` e `user_id`
     * aparecem sempre, mesmo que nulos. Todas as linhas do lote precisam ter
     * exatamente as mesmas chaves, na mesma ordem.
     *
     * @param  array<string, mixed>  $slot
     * @return array<string, mixed>
     */
    private function linha(array $slot, string $data, int $reservaId, string $situacao, ?int $userId = null): array
    {
        $agora = Carbon::now();

        return [
            'data' => $data,
            'horario_inicio' => $slot['horario_inicio'],
            'horario_fim' => $slot['horario_fim'],
            'agenda_id' => $slot['agenda_id'],
            'reserva_id' => $reservaId,
            'situacao' => $situacao,
            'justificativa' => null,
            'user_id' => $userId,
            'created_at' => $agora,
            'updated_at' => $agora,
        ];
    }

    /**
     * @param  array<string, mixed>  $slot
     */
    private function chaveSlot(array $slot): string
    {
        return implode('-', [
            $slot['agenda_id'],
            $slot['data'],
            $slot['horario_inicio'],
            $slot['horario_fim'],
        ]);
    }

    /**
     * Padrao semanal: mesma agenda, mesmo dia da semana, mesmo intervalo.
     *
     * @param  array<string, mixed>  $slot
     */
    private function chavePadrao(array $slot): string
    {
        return implode('-', [
            $slot['agenda_id'],
            Carbon::parse($slot['data'])->dayOfWeek,
            $slot['horario_inicio'],
            $slot['horario_fim'],
        ]);
    }

    /**
     * Normaliza o resultado do callback resolverSituacao para suportar tanto
     * string legada (situacao) quanto array novo (situacao + user_id).
     *
     * @param  string|array{situacao: string, user_id: ?int}  $resultado
     * @return array{0: string, 1: ?int}
     */
    private function normalizarResultado(string|array $resultado): array
    {
        if (\is_string($resultado)) {
            return [$resultado, null];
        }

        return [$resultado['situacao'], $resultado['user_id']];
    }
}
