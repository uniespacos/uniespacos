<?php

declare(strict_types=1);

namespace App\Rules;

use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class DataDoHorarioNoPeriodo implements DataAwareRule, ValidationRule
{
    /**
     * @var array<string, mixed>
     */
    protected array $data = [];

    /**
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $dataInicial = $this->data['data_inicial'] ?? null;
        $dataFinal = $this->data['data_final'] ?? null;

        if (! is_string($value) || ! is_string($dataInicial) || ! is_string($dataFinal)) {
            return;
        }

        if (strtotime($value) === false || strtotime($dataInicial) === false || strtotime($dataFinal) === false) {
            return;
        }

        $data = Carbon::parse($value)->toDateString();

        if ($data < Carbon::parse($dataInicial)->toDateString()) {
            $fail('Each time slot date must be on or after the start date.')->translate();

            return;
        }

        if ($data > Carbon::parse($dataFinal)->toDateString()) {
            $fail('Each time slot date must be on or before the end date.')->translate();
        }
    }
}
