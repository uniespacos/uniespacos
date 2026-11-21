<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Espaco;
use App\Repositories\EspacoRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class UsuarioDaMesmaInstituicaoDaAgenda implements ValidationRule
{
    protected ?Espaco $espaco;

    public function __construct(
        int $espacoId,
        private EspacoRepositoryInterface $espacos,
        private UserRepositoryInterface $usuarios,
    ) {
        $this->espaco = $this->espacos->get($espacoId);
    }

    /**
     * @param  Closure(string): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value) {
            return;
        }

        if (! is_int($value) && ! is_string($value)) {
            $fail('O espaço ou usuário informado é inválido.');

            return;
        }

        $user = $this->usuarios->get($value);

        if (! $user || ! $this->espaco) {
            $fail('O espaço ou usuário informado é inválido.');

            return;
        }

        $instituicaoDoUsuario = $user->instituicaoId();
        $instituicaoDoEspaco = $this->espaco->andar?->modulo?->unidade?->instituicao_id;

        if ($instituicaoDoUsuario === null || $instituicaoDoUsuario !== $instituicaoDoEspaco) {
            $fail('O gestor deve pertencer à mesma instituição do espaço.');
        }
    }
}
