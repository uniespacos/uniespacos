<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Arr;

class UserResource extends JsonResource
{
    private const CAMPOS = [
        'id',
        'name',
        'email',
        'email_verified_at',
        'telefone',
        'profile_pic',
        'setor_id',
        'created_at',
        'updated_at',
        'setor',
    ];

    private const CAMPOS_LISTAGEM = [
        'id',
        'name',
        'email',
        'telefone',
        'email_verified_at',
        'setor_id',
        'roles',
        'anonimizado',
    ];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $modelo */
        $modelo = $this->resource;

        return Arr::only($modelo->toArray(), self::CAMPOS);
    }

    /**
     * @param  array<string, mixed>  $usuario
     * @return array<string, mixed>
     */
    public static function paraListagem(array $usuario): array
    {
        return Arr::only($usuario, self::CAMPOS_LISTAGEM);
    }
}
