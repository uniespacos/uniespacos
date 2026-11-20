<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Reserva;
use App\Rules\DataDoHorarioNoPeriodo;
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
     * Vide: docs/regras-de-negocio/validacao.md (validação de datas).
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $route = $this->route('reserva');
        $reservaId = $route instanceof Reserva ? $route->id : null;
        $regraPeriodoDosHorarios = $this->input('edit_scope') === 'recurring' ? [new DataDoHorarioNoPeriodo] : [];

        return [
            'titulo' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string', 'max:2000'],
            'publico_estimado' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'categoria' => ['nullable', 'string', 'max:100'],
            'termo_responsabilidade' => ['sometimes', 'accepted'],
            'data_inicial' => ['required', 'date'],
            'data_final' => ['required', 'date', 'after_or_equal:data_inicial'],
            'recorrencia' => ['required', 'in:unica,15dias,1mes,personalizado'],
            'edit_scope' => ['required', 'string', Rule::in(['single', 'recurring'])],
            'edited_week_date' => ['required_if:edit_scope,single', 'nullable', 'date'],
            'horarios_solicitados' => ['present', 'array', new HorariosMesmoEspaco],
            'horarios_solicitados.*.data' => ['required', 'date', ...$regraPeriodoDosHorarios],
            'horarios_solicitados.*.horario_inicio' => ['required', 'date_format:H:i:s'],
            'horarios_solicitados.*.horario_fim' => ['required', 'date_format:H:i:s', 'after:horarios_solicitados.*.horario_inicio'],
            'horarios_solicitados.*.agenda_id' => [
                'required',
                'integer',
                'exists:agendas,id',
                new HorarioDisponivel($reservaId),
            ],
        ];
    }

    /**
     * Get custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'edit_scope.required' => 'O escopo de edição é obrigatório.',
            'edit_scope.in' => 'O escopo de edição deve ser "single" ou "recurring".',
            'edited_week_date.required_if' => 'A data da semana editada é obrigatória para edição de ocorrência única.',
            'descricao.max' => __('The description may not have more than :max characters.', ['max' => 2000]),
            'publico_estimado.integer' => __('The estimated audience must be an integer.'),
            'publico_estimado.min' => __('The estimated audience must be at least :min.', ['min' => 1]),
            'publico_estimado.max' => __('The estimated audience may not be greater than :max.', ['max' => 5000]),
            'categoria.max' => 'A categoria não pode ter mais de 100 caracteres.',
            'termo_responsabilidade.accepted' => 'É obrigatório aceitar o termo de responsabilidade.',
            'data_inicial.required' => 'A data inicial é obrigatória.',
            'data_inicial.date' => 'A data inicial deve ser uma data válida.',
            'data_final.required' => 'A data final é obrigatória.',
            'data_final.date' => 'A data final deve ser uma data válida.',
            'data_final.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
            'horarios_solicitados.*.data.required' => 'A data de cada horário é obrigatória.',
            'horarios_solicitados.*.data.date' => 'A data de cada horário deve ser uma data válida.',
            'horarios_solicitados.*.horario_fim.after' => 'O horário de término deve ser posterior ao horário de início.',
        ];
    }
}
