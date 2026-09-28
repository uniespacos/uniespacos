<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Translation\PotentiallyTranslatedString;

class HorariosMesmoEspaco implements ValidationRule
{
    /**
     * Run the validation rule.
     * Ensures all requested horarios point to the same espaco.
     *
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_array($value) || empty($value)) {
            return;
        }

        $espacoIds = [];
        foreach ($value as $horario) {
            if (! is_array($horario) || ! isset($horario['agenda_id'])) {
                continue;
            }

            $espaceId = DB::table('agendas')
                ->where('id', $horario['agenda_id'])
                ->value('espaco_id');

            if ($espaceId !== null && (is_string($espaceId) || is_int($espaceId))) {
                $espacoIds[] = $espaceId;
            }
        }

        if (! empty($espacoIds) && count(array_unique($espacoIds)) > 1) {
            $fail('Todos os horários solicitados devem estar no mesmo espaço.');
        }
    }
}
