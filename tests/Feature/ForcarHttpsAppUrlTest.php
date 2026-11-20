<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Providers\AppServiceProvider;
use Illuminate\Pagination\Paginator;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ForcarHttpsAppUrlTest extends TestCase
{
    private string $appUrlOriginal = 'http://localhost';

    protected function setUp(): void
    {
        parent::setUp();

        $this->appUrlOriginal = (string) config('app.url');
    }

    protected function tearDown(): void
    {
        config(['app.url' => $this->appUrlOriginal]);
        URL::forceScheme(null);
        Paginator::currentPathResolver(fn (): string => $this->app['request']->url());

        parent::tearDown();
    }

    public function test_forca_https_em_rotas_paginacao_e_redirect_de_login_quando_app_url_usa_https(): void
    {
        config(['app.url' => 'https://uniespacos.phplemos.dev']);
        (new AppServiceProvider($this->app))->boot();

        $this->assertStringStartsWith('https://', route('espacos.index'));

        $usuario = User::factory()->create();

        $respostaLogin = $this->withHeaders([
            'Host' => 'uniespacos.phplemos.dev',
            'X-Forwarded-Proto' => 'http',
        ])->post('http://uniespacos.phplemos.dev/login', [
            'email' => $usuario->email,
            'password' => 'password',
        ]);

        $respostaLogin->assertRedirect('https://uniespacos.phplemos.dev/dashboard');
        $this->assertSame(
            'https://uniespacos.phplemos.dev/login',
            Paginator::resolveCurrentPath()
        );
    }

    public function test_normaliza_url_intended_http_para_https_no_login_quando_app_url_usa_https(): void
    {
        config(['app.url' => 'https://uniespacos.phplemos.dev']);
        (new AppServiceProvider($this->app))->boot();

        $usuario = User::factory()->create();

        $respostaLogin = $this->withSession([
            'url.intended' => 'http://uniespacos.phplemos.dev/espacos?page=2',
        ])->withHeaders([
            'Host' => 'uniespacos.phplemos.dev',
            'X-Forwarded-Proto' => 'http',
        ])->post('http://uniespacos.phplemos.dev/login', [
            'email' => $usuario->email,
            'password' => 'password',
        ]);

        $respostaLogin->assertRedirect('https://uniespacos.phplemos.dev/espacos?page=2');
    }
}
