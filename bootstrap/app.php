<?php

declare(strict_types=1);

use App\Exceptions\ErrorEnvelope;
use App\Exceptions\ExceptionContext;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\HandleLocale;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Auth\Middleware\EnsureEmailIsVerified;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'verified' => EnsureEmailIsVerified::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleLocale::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Issue #112: contexto anexado a toda exceção logada, para não repetir
        // user_id/rota em cada chamada de Log.
        $exceptions->context(fn () => ExceptionContext::build());

        // Sessão expirada numa visita Inertia (ex.: paginação, favoritar) vira um
        // redirect 302 comum pro login, que o cliente Inertia não reconhece como
        // resposta válida ("All Inertia requests must receive a valid Inertia
        // resposta") porque não é um visit — Inertia::location() força reload
        // completo do navegador em vez de tentar tratar como partial visit.
        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->header('X-Inertia')) {
                return Inertia::location(route('login'));
            }
        });

        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            // Issue #112: o envelope vale em todos os ambientes — é contrato de
            // resposta, não recurso de depuração. Requisições Inertia não caem
            // aqui: elas enviam Accept: text/html, então expectsJson() é false.
            if ($request->expectsJson()) {
                return ErrorEnvelope::apply($response);
            }

            // Issue #119: sem o que vem abaixo, um abort(403) numa visita Inertia
            // devolve HTML que o cliente não sabe renderizar, e o usuário vê o
            // modal de erro cru do Inertia com a página do Symfony dentro.
            //
            // Local e testing ficam de fora de propósito: em local preserva a
            // página de debug do Laravel; em testing mantém o 403 puro, para que
            // assertForbidden() não dependa do bundle do React.
            if (app()->environment(['local', 'testing'])) {
                return $response;
            }

            if (! in_array($response->getStatusCode(), [403, 404, 419, 500, 503], true)) {
                return $response;
            }

            return Inertia::render('Errors/ErrorPage', ['status' => $response->getStatusCode()])
                ->toResponse($request)
                ->setStatusCode($response->getStatusCode());
        });
    })->create();
