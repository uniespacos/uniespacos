<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreUnidadeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('unidades.criar');
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'sigla' => ['required', 'string', 'max:10'],
            'instituicao_id' => ['required', 'integer', 'exists:instituicaos,id'],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome da unidade é obrigatório.',
            'nome.max' => 'O nome da unidade não pode ter mais de 255 caracteres.',
            'sigla.required' => 'A sigla da unidade é obrigatória.',
            'sigla.max' => 'A sigla da unidade não pode ter mais de 10 caracteres.',
            'instituicao_id.required' => 'A instituição é obrigatória.',
            'instituicao_id.exists' => 'A instituição selecionada não existe.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'nome' => 'nome da unidade',
            'sigla' => 'sigla da unidade',
            'instituicao_id' => 'instituição',
        ];
    }
}
