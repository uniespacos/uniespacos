<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\Carbon;
use Closure;
use DateTimeImmutable;
use InvalidArgumentException;

final readonly class SemanaDeReferencia
{
    private const HOJE = 'today';

    private function __construct(
        public string $inicio,
        public string $fim,
        public string $referencia,
    ) {}

    /**
     * Null e 'today' resolvem para hoje; qualquer outra entrada precisa ser Y-m-d.
     *
     * @throws InvalidArgumentException quando a entrada não é uma data nem 'today'
     */
    public static function de(?string $valor): self
    {
        if ($valor === null || $valor === self::HOJE) {
            $referencia = Carbon::today();
        } elseif (self::eDataIso($valor)) {
            $referencia = Carbon::parse($valor);
        } else {
            throw new InvalidArgumentException('Semana de referência inválida.');
        }

        return new self(
            inicio: $referencia->copy()->startOfWeek(Carbon::MONDAY)->format('Y-m-d'),
            fim: $referencia->copy()->endOfWeek(Carbon::SUNDAY)->format('Y-m-d'),
            referencia: $referencia->format('Y-m-d'),
        );
    }

    /**
     * Regras de validação do parâmetro `semana`, reaproveitadas pelos FormRequests.
     *
     * @return array<int, mixed>
     */
    public static function regras(): array
    {
        return [
            'nullable',
            'bail',
            'string',
            static function (string $atributo, mixed $valor, Closure $falha): void {
                if (! self::valida($valor)) {
                    $falha(__('validation.date_format', ['attribute' => $atributo, 'format' => 'Y-m-d']));
                }
            },
        ];
    }

    /**
     * Horizonte de conflito a partir do fim da semana (usado pela agenda do espaço).
     */
    public function horizonteDeConflito(): string
    {
        return Carbon::parse($this->fim)->addMonth()->endOfWeek(Carbon::SUNDAY)->format('Y-m-d');
    }

    /**
     * O editor de reserva calcula o horizonte a partir da data de referência, não do
     * fim da semana. As duas bases dão datas diferentes, então ficam separadas para
     * que as props de cada tela continuem iguais às de antes.
     */
    public function horizonteDeConflitoAPartirDaReferencia(): string
    {
        return Carbon::parse($this->referencia)->addMonth()->endOfWeek(Carbon::SUNDAY)->format('Y-m-d');
    }

    /**
     * @return array{inicio: string, fim: string, referencia: string}
     */
    public function paraProps(): array
    {
        return [
            'inicio' => $this->inicio,
            'fim' => $this->fim,
            'referencia' => $this->referencia,
        ];
    }

    private static function valida(mixed $valor): bool
    {
        if ($valor === self::HOJE) {
            return true;
        }

        return is_string($valor) && self::eDataIso($valor);
    }

    private static function eDataIso(string $valor): bool
    {
        $data = DateTimeImmutable::createFromFormat('!Y-m-d', $valor);

        return $data !== false && $data->format('Y-m-d') === $valor;
    }
}
