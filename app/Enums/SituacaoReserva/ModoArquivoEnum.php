<?php

declare(strict_types=1);

namespace App\Enums\SituacaoReserva;

/**
 * Eixo de arquivamento das listagens de reserva.
 *
 * Existe separado de SituacaoReservaEnum porque `inativa` nunca foi um
 * resultado de avaliacao: e um estado de arquivamento que apaga o resultado
 * anterior. Enquanto os dois eixos dividiam o mesmo parametro `situacao`,
 * "mostrar arquivadas" e "filtrar por status" competiam pelo mesmo campo — e
 * no listing do usuario comum isso produzia a contradicao
 * `situacao != 'inativa' AND situacao = 'inativa'`, que devolvia lista vazia
 * em silencio.
 */
enum ModoArquivoEnum: string
{
    case ATIVAS = 'ativas';
    case ARQUIVADAS = 'arquivadas';
    case TODAS = 'todas';

    /**
     * Resolve o valor vindo da query string, caindo no default quando o valor
     * nao existe ou nao e reconhecido.
     *
     * Valor invalido cai em ATIVAS de proposito: o comportamento anterior a
     * #108 e o default, entao `?arquivo=xyz` mostra a listagem normal em vez
     * de uma lista vazia inexplicavel.
     */
    public static function fromFiltro(mixed $valor): self
    {
        return is_string($valor) ? (self::tryFrom($valor) ?? self::ATIVAS) : self::ATIVAS;
    }
}
