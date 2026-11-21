<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreInstituicaoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('instituicoes.criar');
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'sigla' => ['required', 'string', 'max:50'],
            'endereco' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome da instituição é obrigatório.',
            'nome.max' => 'O nome da instituição não pode ter mais de 255 caracteres.',
            'sigla.required' => 'A sigla da instituição é obrigatória.',
            'sigla.max' => 'A sigla da instituição não pode ter mais de 50 caracteres.',
            'endereco.max' => 'O endereço não pode ter mais de 255 caracteres.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'nome' => 'nome da instituição',
            'sigla' => 'sigla da instituição',
            'endereco' => 'endereço',
        ];
    }
}
