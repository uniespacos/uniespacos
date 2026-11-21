<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateSetorRequest extends StoreSetorRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('setor')) ?? false;
    }
}
