<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateEspacoRequest extends StoreEspacoRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('espaco')) ?? false;
    }
}
