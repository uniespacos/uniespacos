<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Agenda;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Regras de auto-aprovacao de horarios e reservas.
 *
 * Extrai a duplicacao presente em ProcessarCriacaoReserva e UpdateReservaJob,
 * consolidando a fonte de verdade para a decisao de aprovacao inicial.
 */
class AutoAprovacaoService
{
    /**
     * Resolve a situacao inicial de um horario individual.
     *
     * Regra: se o dono da agenda (gestor) e o proprietario da reserva, o horario
     * ja nasce deferido — o proprietario automaticamente tem permissao para usar
     * seus proprios espacos. Caso contrario, fica em_analise aguardando avaliacao
     * do gestor.
     *
     * @param  Agenda  $agenda  Agenda na qual o horario esta sendo solicitado.
     * @param  int  $proprietarioReservaId  ID do user que criou/edita a reserva (solicitante ou dono).
     * @return string Valor de SituacaoReservaEnum (deferida ou em_analise).
     */
    public function resolverSituacaoHorario(Agenda $agenda, int $proprietarioReservaId): string
    {
        return $agenda->user_id === $proprietarioReservaId
            ? SituacaoReservaEnum::DEFERIDA->value
            : SituacaoReservaEnum::EM_ANALISE->value;
    }

    /**
     * Calcula a situacao agregada da reserva baseado nos gestores unicos envolvidos.
     *
     * Regra: se ha apenas 1 gestor E esse gestor e o solicitante, a reserva toda
     * e automaticamente deferida (o proprietario administra todos os espacos).
     * Se ha multiplos gestores MAS o solicitante e um deles, a reserva e
     * parcialmente_deferida (alguns horarios sua, alguns depende de outros gestores).
     *
     * Retorna null quando nenhuma condicao se aplica — a reserva permanece com a
     * situacao que ja tinha (tipicamente em_analise setada na criacao).
     *
     * @param  Collection<int, User>  $gestoresUnicos  Users que gerenciam as agendas usadas.
     * @param  int  $solicitanteId  ID do usuario que fez a solicitacao.
     * @return ?string Nova situacao se aplicavel, ou null para preservar a situacao existente.
     */
    public function calcularSituacaoReserva(Collection $gestoresUnicos, int $solicitanteId): ?string
    {
        if ($gestoresUnicos->count() === 1 && $gestoresUnicos->first()->id === $solicitanteId) {
            return SituacaoReservaEnum::DEFERIDA->value;
        }

        if ($gestoresUnicos->contains(fn ($g) => $g->id === $solicitanteId)) {
            return SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value;
        }

        return null;
    }
}
