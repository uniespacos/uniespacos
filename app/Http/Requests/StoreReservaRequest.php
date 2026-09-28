<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Rules\HorarioDisponivel;
use App\Rules\HorariosMesmoEspaco;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreReservaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'titulo' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'data_inicial' => ['required', 'date', 'after_or_equal:today'],
            'data_final' => ['required', 'date', 'after_or_equal:data_inicial'],
            'recorrencia' => ['required', 'in:unica,15dias,1mes,personalizado'],
            'horarios_solicitados' => ['required', 'array', 'min:1', new HorariosMesmoEspaco],
            'horarios_solicitados.*.data' => ['required', 'date', 'after_or_equal:today'],
            'horarios_solicitados.*.horario_inicio' => ['required', 'date_format:H:i:s'],
            'horarios_solicitados.*.horario_fim' => ['required', 'date_format:H:i:s'],
            'horarios_solicitados.*.agenda_id' => [
                'required',
                'integer',
                'exists:agendas,id',
                new HorarioDisponivel,
            ],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'data_inicial.required' => 'A data inicial é obrigatória.',
            'data_inicial.date' => 'A data inicial deve ser uma data válida.',
            'data_inicial.after_or_equal' => 'A data inicial deve ser hoje ou uma data futura.',
            'data_final.required' => 'A data final é obrigatória.',
            'data_final.date' => 'A data final deve ser uma data válida.',
            'data_final.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
            'horarios_solicitados.*.data.required' => 'A data de cada horário é obrigatória.',
            'horarios_solicitados.*.data.date' => 'A data de cada horário deve ser uma data válida.',
            'horarios_solicitados.*.data.after_or_equal' => 'A data do horário deve ser hoje ou uma data futura.',
        ];
    }
}
