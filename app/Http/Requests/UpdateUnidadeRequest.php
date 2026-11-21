<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateUnidadeRequest extends StoreUnidadeRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('unidade')) ?? false;
    }
}
