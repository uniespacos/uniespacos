<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\Agenda\AgendaEnum;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\In;

class ListarEspacosRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, In|string>>
     */
    public function rules(): array
    {
        $fusoConfig = config('reservas.fuso_horario');
        $fuso = is_string($fusoConfig) && $fusoConfig !== '' ? $fusoConfig : 'America/Bahia';

        return [
            'search' => ['nullable', 'string', 'max:255'],
            'unidade' => ['nullable', 'string', 'max:255'],
            'modulo' => ['nullable', 'string', 'max:255'],
            'andar' => ['nullable', 'string', 'max:255'],
            'capacidade' => ['nullable', 'integer', 'min:0'],
            'data' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:'.Carbon::now($fuso)->toDateString()],
            'turno' => ['nullable', Rule::in(array_column(AgendaEnum::cases(), 'value'))],
        ];
    }
}
