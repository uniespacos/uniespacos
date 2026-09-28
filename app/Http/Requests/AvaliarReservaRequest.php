<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Horario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AvaliarReservaRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('reservas.avaliar');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'situacao' => ['required', Rule::in(['parcialmente_deferida', 'deferida', 'indeferida', 'em_analise'])],
            'motivo' => ['required_if:situacao,indeferida', 'nullable'],
            'observacao' => ['nullable', 'string', 'max:500'],
            'horarios_avaliados' => ['required', 'array'],
            'horarios_avaliados.*.status' => ['required'],
            'horarios_avaliados.*.id' => ['required'],
            'evaluation_scope' => ['required', 'string', Rule::in(['recurring', 'single'])],
        ];
    }

    /**
     * Validate that each evaluated horario belongs to an agenda managed by the gestor.
     */
    public function after(): array
    {
        return [
            function ($validator) {
                $gestor = Auth::user();
                if (! $gestor) {
                    return;
                }

                $agendasDoGestorIds = $gestor->agendas()->pluck('id')->toArray();
                $horariosAvaliados = $this->input('horarios_avaliados', []);

                // Extrai IDs com múltiplas estratégias para suportar diferentes formatos
                $horariosIds = [];
                foreach ($horariosAvaliados as $item) {
                    if (is_array($item)) {
                        // Tenta 'id' na raiz, depois 'dadosReserva.horarioDB.id'
                        if (isset($item['id'])) {
                            $horariosIds[] = $item['id'];
                        } elseif (isset($item['dadosReserva']['horarioDB']['id'])) {
                            $horariosIds[] = $item['dadosReserva']['horarioDB']['id'];
                        }
                    }
                }

                if (empty($horariosIds)) {
                    return;
                }

                $agendasDosHorariosIds = Horario::whereIn('id', $horariosIds)
                    ->pluck('agenda_id')
                    ->unique()
                    ->toArray();

                foreach ($agendasDosHorariosIds as $agendaId) {
                    if (! in_array($agendaId, $agendasDoGestorIds, strict: true)) {
                        $validator->errors()->add(
                            'horarios_avaliados',
                            'Um ou mais horários pertencem a agendas que você não gerencia.'
                        );
                        break;
                    }
                }
            },
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $horariosAvaliados = $this->input('horarios_avaliados');

        if (! is_array($horariosAvaliados)) {
            return;
        }

        $this->merge([
            'horarios_avaliados' => array_map(function ($item) {
                if (isset($item['dadosReserva']['horarioDB']['id'])) {
                    $item['dadosReserva'] = [
                        'horarioDB' => ['id' => $item['dadosReserva']['horarioDB']['id']],
                    ];
                }

                return $item;
            }, $horariosAvaliados),
        ]);
    }
}
