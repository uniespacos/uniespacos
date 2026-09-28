<?php

declare(strict_types=1);

namespace App\Enums\SituacaoReserva;

enum SituacaoReservaEnum: string
{
    case EM_ANALISE = 'em_analise';
    case INDEFERIDA = 'indeferida';
    case PARCIALMENTE_DEFERIDA = 'parcialmente_deferida';
    case DEFERIDA = 'deferida';
    case INATIVA = 'inativa';

    public function label(): string
    {
        return match ($this) {
            self::EM_ANALISE => 'Em Análise',
            self::INDEFERIDA => 'Indeferida',
            self::PARCIALMENTE_DEFERIDA => 'Parcialmente Deferida',
            self::DEFERIDA => 'Deferida',
            self::INATIVA => 'Inativa',
        };
    }

    /**
     * Situacoes que resultam de avaliacao — o eixo legitimo do filtro
     * `situacao` nas listagens.
     *
     * INATIVA fica de fora porque nao e resultado de avaliacao, e sim estado
     * de arquivamento; ela e tratada pelo eixo `arquivo`
     * (ver ModoArquivoEnum,.
     *
     * @return array<int, string>
     */
    public static function valoresDeAvaliacao(): array
    {
        return array_map(
            fn (self $caso) => $caso->value,
            array_filter(self::cases(), fn (self $caso) => $caso !== self::INATIVA)
        );
    }

    /**
     * Converte um valor cru do banco no rotulo legivel, sem quebrar
     * caso apareca uma situacao desconhecida.
     */
    public static function labelDe(?string $valor): string
    {
        if ($valor === null) {
            return '—';
        }

        return self::tryFrom($valor)?->label() ?? $valor;
    }
}
