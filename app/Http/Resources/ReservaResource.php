<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Reserva;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Arr;

class ReservaResource extends JsonResource
{
    private const CAMPOS = [
        'id',
        'titulo',
        'descricao',
        'situacao',
        'data_inicial',
        'data_final',
        'recorrencia',
        'observacao',
        'user_id',
        'created_at',
        'updated_at',
        'validation_status',
        'conflict_cache',
        'publico_estimado',
        'categoria',
        'horarios',
        'user',
    ];

    public function __construct(Reserva $reserva, private readonly ?bool $podeAtualizar = null)
    {
        parent::__construct($reserva);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Reserva $modelo */
        $modelo = $this->resource;
        $reserva = Arr::only($modelo->toArray(), self::CAMPOS);

        if ($this->podeAtualizar !== null) {
            $reserva['can_update'] = $this->podeAtualizar;
        }

        return $reserva;
    }
}
