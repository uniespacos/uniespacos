<?php

declare(strict_types=1);

namespace App\Http\Requests;

class UpdateInstituicaoRequest extends StoreInstituicaoRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('instituico')) ?? false;
    }
}
