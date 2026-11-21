<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\SemanaDeReferencia;
use Illuminate\Foundation\Http\FormRequest;

class ListarReservasRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Valores de texto malformados (datas fora do formato, situações desconhecidas)
     * continuam caindo no padrão do domínio, como sempre. A validação aqui barra
     * apenas o que não é escalar (ex.: `?search[]=x`), que hoje vira erro 500.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'semana' => SemanaDeReferencia::regras(),
            'search' => ['nullable', 'string', 'max:255'],
            'situacao' => ['nullable', 'string', 'max:255'],
            'arquivo' => ['nullable', 'string', 'max:255'],
            'ordenar' => ['nullable', 'string', 'max:255'],
            'reserva' => ['nullable', 'string', 'max:20'],
            'data_inicio' => ['nullable', 'string', 'max:10'],
            'data_fim' => ['nullable', 'string', 'max:10'],
        ];
    }

    public function semana(): ?string
    {
        $valor = $this->validated('semana');

        return is_string($valor) ? $valor : null;
    }

    /**
     * @return array<string, mixed>
     */
    public function filtros(): array
    {
        return $this->safe()->only(['search', 'situacao', 'arquivo', 'ordenar', 'reserva', 'data_inicio', 'data_fim']);
    }
}
