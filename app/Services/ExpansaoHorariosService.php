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
     * Recorrencia `unica` significa "apenas os horarios selecionados": grava exatamente
     * as datas recebidas, sem repetir nada. Suporta selecao avulsa em semanas
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
            $agenda = $agendasMap->get($this->chaveAgenda($slot));

            if (! $agenda instanceof Agenda) {
                continue;
            }

            $agendasUsadas->push($agenda);
            $resultado = $resolverSituacao($agenda);
            [$situacao, $userId] = $this->normalizarResultado($resultado);
            $linhas[] = $this->linha($slot, $this->valorString($slot['data'] ?? null), $reservaId, $situacao, $userId);
        }

        return [$linhas, $agendasUsadas->unique('id')->values()];
    }

    /**
     * Demais recorrencias sao periodo, nao frequencia (`1mes` = "replicada por
     * um mes"), entao cada slot se repete SEMANALMENTE ate `data_final`,
     * respeitando qualquer data futura do mesmo dia da semana que ja possua
     * selecao explicita no payload (evitando sobrescrever selecoes de semanas
     * subsequentes com os horarios da semana anterior).
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
        /** @var array<int, array<string, Carbon>> $mapaPorDiaSemana */
        $mapaPorDiaSemana = [];
        foreach ($slots as $slot) {
            $dataStrSlot = $this->valorString($slot['data'] ?? null);
            if ($dataStrSlot === '') {
                continue;
            }
            $dataCarbon = Carbon::parse($dataStrSlot)->startOfDay();
            $diaSemana = $dataCarbon->dayOfWeek;
            $mapaPorDiaSemana[$diaSemana][$dataCarbon->toDateString()] = $dataCarbon;
        }

        /** @var array<int, list<Carbon>> $datasPorDiaSemana */
        $datasPorDiaSemana = [];
        foreach ($mapaPorDiaSemana as $diaSemana => $mapaDatas) {
            ksort($mapaDatas);
            $datasPorDiaSemana[$diaSemana] = array_values($mapaDatas);
        }

        $linhas = [];
        $chavesGeradas = [];
        $agendasUsadas = collect();

        $unicos = collect($slots)->unique(
            fn (array $slot) => $this->chaveSlot($slot)
        );

        foreach ($unicos as $slot) {
            $agenda = $agendasMap->get($this->chaveAgenda($slot));

            if (! $agenda instanceof Agenda) {
                continue;
            }

            $dataStrInicial = $this->valorString($slot['data'] ?? null);
            if ($dataStrInicial === '') {
                continue;
            }

            $agendasUsadas->push($agenda);
            $resultado = $resolverSituacao($agenda);
            [$situacao, $userId] = $this->normalizarResultado($resultado);

            $dataInicialSlot = Carbon::parse($dataStrInicial)->startOfDay();
            $proximaDataExplicita = null;
            foreach ($datasPorDiaSemana[$dataInicialSlot->dayOfWeek] ?? [] as $dataCandidata) {
                if ($dataCandidata->gt($dataInicialSlot)) {
                    $proximaDataExplicita = $dataCandidata;
                    break;
                }
            }

            $cursor = $dataInicialSlot->copy();
            $horarioInicio = $this->valorString($slot['horario_inicio'] ?? null);

            while ($cursor->lte($dataFinal) && (! $proximaDataExplicita instanceof Carbon || $cursor->lt($proximaDataExplicita))) {
                $dataStr = $cursor->toDateString();
                $chaveLinha = $agenda->id.'|'.$dataStr.'|'.$horarioInicio;
                if (! isset($chavesGeradas[$chaveLinha])) {
                    $chavesGeradas[$chaveLinha] = true;
                    $linhas[] = $this->linha($slot, $dataStr, $reservaId, $situacao, $userId);
                }
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
     * Chave do agendasMap (keyBy('id')). A regra `integer` aceita int, string
     * numérica e float de valor inteiro; todos são normalizados para int.
     *
     * @param  array<string, mixed>  $slot
     */
    private function chaveAgenda(array $slot): ?int
    {
        $agendaId = $slot['agenda_id'];

        return is_numeric($agendaId) ? (int) $agendaId : null;
    }

    /**
     * @param  array<string, mixed>  $slot
     */
    private function chaveSlot(array $slot): string
    {
        return $this->valorString($slot['agenda_id'] ?? null)
            .'-'.$this->valorString($slot['data'] ?? null)
            .'-'.$this->valorString($slot['horario_inicio'] ?? null)
            .'-'.$this->valorString($slot['horario_fim'] ?? null);
    }

    private function valorString(mixed $valor): string
    {
        return is_string($valor) || is_int($valor) || is_float($valor) ? (string) $valor : '';
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
