<?php

declare(strict_types=1);

namespace App\Enums\SituacaoReserva;

/**
 * Critério de ordenação das listagens de reserva.
 *
 * DATA_SOLICITACAO é o comportamento histórico (`->latest()`, por
 * created_at). SITUACAO prioriza o que precisa de atenção primeiro —
 * pendentes e parciais no topo, deferidas e arquivadas no fim — em vez da
 * ordem alfabética do enum, que não tem esse significado.
 */
enum OrdenacaoReservaEnum: string
{
    case DATA_SOLICITACAO = 'data_solicitacao';
    case SITUACAO = 'situacao';

    /**
     * Resolve o valor vindo da query string, caindo no default quando o
     * valor não existe ou não é reconhecido — mesma regra de segurança do
     * ModoArquivoEnum::fromFiltro: um valor inválido não pode devolver lista
     * vazia ou erro, só o comportamento padrão.
     */
    public static function fromFiltro(mixed $valor): self
    {
        return is_string($valor) ? (self::tryFrom($valor) ?? self::DATA_SOLICITACAO) : self::DATA_SOLICITACAO;
    }
}
