<?php

declare(strict_types=1);

namespace App\Support;

use Carbon\Carbon;

final class SlotDeHorario
{
    /**
     * @param  array<array-key, mixed>  $linha
     * @return array{agenda_id: int, data: string, horario_inicio: string, horario_fim: string}
     */
    public static function normalizar(array $linha): array
    {
        $agendaIdRaw = $linha['agenda_id'] ?? 0;
        $dataRaw = $linha['data'] ?? '';

        return [
            'agenda_id' => is_int($agendaIdRaw) || is_string($agendaIdRaw) ? (int) $agendaIdRaw : 0,
            'data' => is_string($dataRaw) && $dataRaw !== '' ? Carbon::parse($dataRaw)->toDateString() : '',
            'horario_inicio' => self::hora($linha['horario_inicio'] ?? ''),
            'horario_fim' => self::hora($linha['horario_fim'] ?? ''),
        ];
    }

    /**
     * O Postgres devolve horas como HH:MM:SS. Sem esse formato, a comparação de
     * string faz '10:00:00' > '10:00' e intervalos adjacentes viram conflito.
     */
    private static function hora(mixed $valor): string
    {
        if (! is_string($valor)) {
            return '';
        }

        if (preg_match('/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/', $valor, $partes) !== 1) {
            return $valor;
        }

        return sprintf('%02d:%02d:%02d', (int) $partes[1], (int) $partes[2], (int) ($partes[3] ?? 0));
    }
}
