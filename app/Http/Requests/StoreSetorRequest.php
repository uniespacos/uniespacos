<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreSetorRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('setores.criar');
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'min:2', 'max:255'],
            'sigla' => ['required', 'string', 'min:2', 'max:10'],
            'unidade_id' => ['required', 'integer', 'exists:unidades,id'],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome do setor é obrigatório.',
            'nome.string' => 'O nome do setor deve ser um texto válido.',
            'nome.max' => 'O nome do setor não pode ter mais de 255 caracteres.',
            'nome.min' => 'O nome do setor deve ter pelo menos 2 caracteres.',
            'sigla.required' => 'A sigla do setor é obrigatório.',
            'sigla.string' => 'A sigla do setor deve ser um texto válido.',
            'sigla.max' => 'A sigla do setor não pode ter mais de 10 caracteres.',
            'sigla.min' => 'A sigla do setor deve ter pelo menos 2 caracteres.',
            'unidade_id.required' => 'A unidade é obrigatória.',
            'unidade_id.integer' => 'A unidade deve ser um número válido.',
            'unidade_id.exists' => 'A unidade selecionada não existe.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'nome' => 'nome do setor',
            'sigla' => 'sigla do setor',
            'unidade_id' => 'unidade',
        ];
    }
}
