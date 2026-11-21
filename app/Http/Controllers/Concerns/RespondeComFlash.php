<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Support\MensagemDeErro;
use Illuminate\Http\RedirectResponse;
use Throwable;

trait RespondeComFlash
{
    /**
     * A falha sempre volta pelo flash `error`, que o AppLayout exibe como toast; `$mensagemErro` é a chave
     * de tradução com `:message`, preenchida por MensagemDeErro::paraUsuario.
     */
    protected function executar(
        callable $acao,
        string $mensagemSucesso,
        string $mensagemErro,
        ?string $rotaSucesso = null,
        ?string $rotaErro = null,
        bool $comEntrada = false,
    ): RedirectResponse {
        try {
            $acao();
        } catch (Throwable $e) {
            $destino = $rotaErro !== null ? redirect()->route($rotaErro) : back();

            if ($comEntrada) {
                $destino->withInput();
            }

            return $destino->with('error', __($mensagemErro, ['message' => MensagemDeErro::paraUsuario($e)]));
        }

        $destino = $rotaSucesso !== null ? redirect()->route($rotaSucesso) : back();

        return $destino->with('success', $mensagemSucesso);
    }
}
