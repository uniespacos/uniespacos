<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

/**
 * Contexto anexado automaticamente a toda exceção logada.
 *
 * ALCANCE — vale para exceções que chegam ao handler (não capturadas, ou
 * passadas a report()). Chamadas manuais de `Log::error` NÃO passam por aqui:
 * o closure registrado em `$exceptions->context()` é consumido por
 * Handler::buildExceptionContext(), no caminho de report da exceção. Por isso
 * cada `Log::` no app continua declarando os próprios identificadores.
 *
 * SEGURANÇA — o corpo da requisição fica de fora deliberadamente. A issue pedia
 * "request data" no contexto, mas o app trafega senha em texto plano em pelo
 * menos um fluxo (ConfirmPasswordRequest, que protege o cancelamento de
 * reserva), e um dump ingênuo gravaria essa senha nos arquivos de log — uma
 * vulnerabilidade nova criada pela própria correção. Rota, usuário e stack
 * trace resolvem a depuração sem essa superfície. Se um dia o payload for mesmo
 * necessário, ele precisa passar por uma lista de redação antes.
 */
final class ExceptionContext
{
    /**
     * @return array<string, mixed>
     */
    public static function build(): array
    {
        $context = ['user_id' => Auth::id()];

        // Jobs e comandos não têm requisição real: incluir rota/URL ali produz
        // dado enganoso — request() montada a partir do CLI devolve method GET e
        // url http://localhost, que não correspondem a requisição nenhuma.
        //
        // runningUnitTests() abre exceção porque a suíte roda via console mesmo
        // quando simula HTTP. Sem isso, o ramo abaixo seria impossível de cobrir
        // por teste, e comportamento sem teste é comportamento que regride.
        if (app()->runningInConsole() && ! app()->runningUnitTests()) {
            return $context;
        }

        $request = request();

        return $context + [
            'route' => Route::currentRouteName(),
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
        ];
    }
}
