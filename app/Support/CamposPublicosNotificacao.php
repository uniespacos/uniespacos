<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Arr;

final class CamposPublicosNotificacao
{
    public const REGISTRO = ['id', 'type', 'read_at', 'created_at'];

    public const DADOS = [
        'titulo',
        'mensagem',
        'descricao',
        'chave',
        'parametros',
        'reserva_id',
        'url',
        'tipo',
    ];

    /**
     * @param  array<string, mixed>  $dados
     * @return array<string, mixed>
     */
    public static function dadosPublicos(array $dados): array
    {
        return Arr::only($dados, self::DADOS);
    }
}
