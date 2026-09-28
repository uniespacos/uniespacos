<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Rules\HorarioDisponivel;
use App\Rules\HorariosMesmoEspaco;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateReservaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * NOTA IMPORTANTE - Assimetria com StoreReservaRequest:
     *
     * data_inicial e horarios_solicitados[].data recebem apenas ['required', 'date'],
     * SEM 'after_or_equal:today'. Motivo: reservas recorrentes em andamento (criadas
     * no passado) precisam ser editáveis sem rejeição. O que importa validar na edição
     * são os novos horários (não a âncora histórica). Qualquer alteração de data para
     * trás será manual (autorizada pelo gestor/admin).
     *
     * Vide: docs/plano-execucao-regras-reserva/fase-03-validacao-datas/INSTRUCOES.md (T3.2)
     */
    public function rules(): array
    {
        return [
            'titulo' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string'],
            'data_inicial' => ['required', 'date'],
            'data_final' => ['required', 'date', 'after_or_equal:data_inicial'],
            'recorrencia' => ['required', 'in:unica,15dias,1mes,personalizado'],
            'edit_scope' => ['required', 'string', Rule::in(['single', 'recurring'])],
            'edited_week_date' => ['required_if:edit_scope,single', 'nullable', 'date'],
            'horarios_solicitados' => ['present', 'array', new HorariosMesmoEspaco],
            'horarios_solicitados.*.data' => ['required', 'date'],
            'horarios_solicitados.*.horario_inicio' => ['required', 'date_format:H:i:s'],
            'horarios_solicitados.*.horario_fim' => ['required', 'date_format:H:i:s'],
            'horarios_solicitados.*.agenda_id' => [
                'required',
                'integer',
                'exists:agendas,id',
                new HorarioDisponivel($this->route('reserva')?->id),
            ],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'edit_scope.required' => 'O escopo de edição é obrigatório.',
            'edit_scope.in' => 'O escopo de edição deve ser "single" ou "recurring".',
            'edited_week_date.required_if' => 'A data da semana editada é obrigatória para edição de ocorrência única.',
            'data_inicial.required' => 'A data inicial é obrigatória.',
            'data_inicial.date' => 'A data inicial deve ser uma data válida.',
            'data_final.required' => 'A data final é obrigatória.',
            'data_final.date' => 'A data final deve ser uma data válida.',
            'data_final.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
            'horarios_solicitados.*.data.required' => 'A data de cada horário é obrigatória.',
            'horarios_solicitados.*.data.date' => 'A data de cada horário deve ser uma data válida.',
        ];
    }
}
