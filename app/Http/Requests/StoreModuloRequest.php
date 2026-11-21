<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class StoreModuloRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::user()?->hasPermissionTo('modulos.criar');
    }

    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'min:2', 'max:255'],
            'unidade_id' => ['required', 'integer', 'exists:unidades,id'],
            'andares' => ['required', 'array', 'min:1', 'max:12'],
            'andares.*.nome' => [
                'required',
                'string',
                'in:subsolo-2,subsolo-1,terreo,andar-1,andar-2,andar-3,andar-4,andar-5,andar-6,andar-7,andar-8,andar-9,andar-10',
            ],
            'andares.*.tipo_acesso' => ['required', 'array', 'min:1'],
            'andares.*.tipo_acesso.*' => ['required', 'string', 'in:terreo,escada,elevador,rampa'],
        ];
    }

    /**
     * Get custom validation messages.
     */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome do módulo é obrigatório.',
            'nome.string' => 'O nome do módulo deve ser um texto válido.',
            'nome.max' => 'O nome do módulo não pode ter mais de 255 caracteres.',
            'nome.min' => 'O nome do módulo deve ter pelo menos 2 caracteres.',
            'unidade_id.required' => 'A unidade é obrigatória.',
            'unidade_id.integer' => 'A unidade deve ser um número válido.',
            'unidade_id.exists' => 'A unidade selecionada não existe.',
            'andares.required' => 'Pelo menos um andar deve ser configurado.',
            'andares.array' => 'Os andares devem ser uma lista válida.',
            'andares.min' => 'Pelo menos um andar deve ser configurado.',
            'andares.max' => 'Máximo de 12 andares permitidos (2 subsolos + térreo + 10 andares superiores).',
            'andares.*.nome.required' => 'O nome do andar é obrigatório.',
            'andares.*.nome.string' => 'O nome do andar deve ser um texto válido.',
            'andares.*.nome.in' => 'O andar selecionado não é válido.',
            'andares.*.tipo_acesso.required' => 'Pelo menos um tipo de acesso deve ser selecionado.',
            'andares.*.tipo_acesso.array' => 'Os tipos de acesso devem ser uma lista válida.',
            'andares.*.tipo_acesso.min' => 'Pelo menos um tipo de acesso deve ser selecionado.',
            'andares.*.tipo_acesso.*.required' => 'O tipo de acesso é obrigatório.',
            'andares.*.tipo_acesso.*.string' => 'O tipo de acesso deve ser um texto válido.',
            'andares.*.tipo_acesso.*.in' => 'O tipo de acesso selecionado não é válido.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'nome' => 'nome do módulo',
            'unidade_id' => 'unidade',
            'andares' => 'andares',
            'andares.*.nome' => 'nome do andar',
            'andares.*.tipo_acesso' => 'tipos de acesso',
        ];
    }

    /**
     * Configure the validator instance with additional cross-field rules.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $this->validateAndaresStructure($validator);
            $this->validateAndaresUniqueness($validator);
            $this->validateTerreoExists($validator);
            $this->validateSequenceIntegrity($validator);
        });
    }

    /**
     * Validates that the floor sequence has no gaps between levels.
     */
    protected function validateAndaresStructure($validator): void
    {
        $andares = $this->input('andares', []);

        if (empty($andares)) {
            return;
        }

        $nivelMap = [
            'subsolo-2' => -2, 'subsolo-1' => -1, 'terreo' => 0,
            'andar-1' => 1, 'andar-2' => 2, 'andar-3' => 3, 'andar-4' => 4,
            'andar-5' => 5, 'andar-6' => 6, 'andar-7' => 7, 'andar-8' => 8,
            'andar-9' => 9, 'andar-10' => 10,
        ];

        $niveis = [];
        foreach ($andares as $andar) {
            if (isset($andar['nome'], $nivelMap[$andar['nome']])) {
                $niveis[] = $nivelMap[$andar['nome']];
            }
        }

        if (empty($niveis)) {
            return;
        }

        sort($niveis);

        for ($i = 1; $i < count($niveis); $i++) {
            if ($niveis[$i] - $niveis[$i - 1] > 1) {
                $nomeAnterior = array_search($niveis[$i - 1], $nivelMap);
                $nomeAtual = array_search($niveis[$i], $nivelMap);

                $validator->errors()->add(
                    'andares',
                    "Há um gap na sequência entre {$this->formatAndarName($nomeAnterior)} e {$this->formatAndarName($nomeAtual)}. Todos os andares intermediários devem estar presentes."
                );
                break;
            }
        }
    }

    /**
     * Validates that no floor name is duplicated.
     */
    protected function validateAndaresUniqueness($validator): void
    {
        $andares = $this->input('andares', []);
        $nomes = array_column($andares, 'nome');

        if (count($nomes) !== count(array_unique($nomes))) {
            $validator->errors()->add('andares', 'Há andares duplicados. Cada andar deve ser único.');
        }
    }

    /**
     * Validates that the ground floor (térreo) is always present.
     */
    protected function validateTerreoExists($validator): void
    {
        $nomes = array_column($this->input('andares', []), 'nome');

        if (! in_array('terreo', $nomes)) {
            $validator->errors()->add('andares', 'O térreo é obrigatório e deve estar presente.');
        }
    }

    /**
     * Validates that each upper floor has its prerequisite floor present.
     */
    protected function validateSequenceIntegrity($validator): void
    {
        $nomes = array_column($this->input('andares', []), 'nome');

        foreach (['andar-1', 'andar-2', 'andar-3', 'andar-4', 'andar-5', 'andar-6', 'andar-7', 'andar-8', 'andar-9', 'andar-10'] as $andar) {
            if (! in_array($andar, $nomes)) {
                continue;
            }

            $nivel = (int) str_replace('andar-', '', $andar);
            $requisito = $nivel === 1 ? 'terreo' : 'andar-'.($nivel - 1);

            if (! in_array($requisito, $nomes)) {
                $label = $nivel === 1 ? 'o térreo' : "o {$requisito}º andar";
                $validator->errors()->add('andares', "Para ter o {$nivel}º andar, é necessário ter {$label}.");
            }
        }

        if (in_array('subsolo-2', $nomes) && ! in_array('subsolo-1', $nomes)) {
            $validator->errors()->add('andares', 'Para ter o 2º subsolo, é necessário ter o subsolo.');
        }
    }

    /**
     * Formats a floor key into a human-readable label.
     */
    protected function formatAndarName(string $nome): string
    {
        return [
            'subsolo-2' => '2º Subsolo', 'subsolo-1' => 'Subsolo', 'terreo' => 'Térreo',
            'andar-1' => '1º Andar', 'andar-2' => '2º Andar', 'andar-3' => '3º Andar',
            'andar-4' => '4º Andar', 'andar-5' => '5º Andar', 'andar-6' => '6º Andar',
            'andar-7' => '7º Andar', 'andar-8' => '8º Andar', 'andar-9' => '9º Andar',
            'andar-10' => '10º Andar',
        ][$nome] ?? $nome;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('andares') || ! is_array($this->input('andares'))) {
            $this->merge(['andares' => []]);
        }

        $andares = $this->input('andares', []);
        foreach ($andares as $index => $andar) {
            if (isset($andar['tipo_acesso']) && is_array($andar['tipo_acesso'])) {
                $andares[$index]['tipo_acesso'] = array_filter($andar['tipo_acesso']);
            }
        }

        $this->merge(['andares' => $andares]);
    }
}
