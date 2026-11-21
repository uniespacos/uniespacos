<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Modulo;

class UpdateModuloRequest extends StoreModuloRequest
{
    public function authorize(): bool
    {
        $modulo = $this->route('modulo');

        return $modulo instanceof Modulo && ($this->user()?->can('update', $modulo) ?? false);
    }
}
