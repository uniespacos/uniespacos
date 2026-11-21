<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\Agenda\AgendaEnum;
use App\Repositories\EspacoRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use App\Rules\UsuarioDaMesmaInstituicaoDaAgenda;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AlterarGestoresEspacoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('espacos.alterar-gestores');
    }

    public function rules(): array
    {
        $espacoId = $this->route('espaco')->id;

        return [
            'gestores' => ['required'],
            'gestores.turno.*' => ['required', 'string', Rule::enum(AgendaEnum::class)],
            'gestores.user_id.*' => [
                'nullable',
                'exists:users,id',
                new UsuarioDaMesmaInstituicaoDaAgenda($espacoId, app(EspacoRepositoryInterface::class), app(UserRepositoryInterface::class)),
            ],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'required' => 'O campo :attribute é obrigatório.',
            'exists' => 'O valor selecionado para :attribute é inválido.',
        ];
    }
}
