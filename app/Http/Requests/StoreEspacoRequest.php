<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreEspacoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('espacos.criar');
    }

    public function rules(): array
    {
        return [
            'unidade_id' => ['required', 'integer', 'exists:unidades,id'],
            'modulo_id' => ['required', 'integer', 'exists:modulos,id'],
            'andar_id' => ['required', 'integer', 'exists:andars,id'],
            'nome' => ['required', 'string', 'max:255'],
            'capacidade_pessoas' => ['required', 'integer', 'min:1'],
            'descricao' => ['required', 'nullable', 'string'],
            'imagens' => ['nullable', 'array', 'max:5'],
            'imagens.*' => ['image', 'mimes:jpeg,png,jpg,webp', 'max:5120'],
            'main_image_index' => ['required_with:imagens', 'nullable', 'integer'],
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
            'capacidade_pessoas.integer' => 'A capacidade de pessoas deve ser um número inteiro.',
            'capacidade_pessoas.min' => 'A capacidade de pessoas deve ser de no mínimo :min.',
            'imagens.array' => 'O campo de imagens deve ser um conjunto de arquivos.',
            'imagens.max' => 'Você pode enviar no máximo :max imagens.',
            'imagens.*.image' => 'O arquivo enviado não é uma imagem válida.',
            'imagens.*.mimes' => 'A imagem deve ser de um dos seguintes tipos: :values.',
            'imagens.*.max' => 'Cada imagem não pode ter mais de 5MB.',
            'main_image_index.required_with' => 'É necessário selecionar uma imagem principal quando imagens são enviadas.',
        ];
    }
}
