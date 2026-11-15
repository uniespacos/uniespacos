<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\UpdateModuloRequest;
use App\Models\User;
use Illuminate\Container\Container;
use Illuminate\Contracts\Container\Container as ContainerContract;
use Illuminate\Contracts\Foundation\Application as ApplicationContract;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Facade;
use Mockery;
use PHPUnit\Framework\TestCase;

class UpdateModuloRequestTest extends TestCase
{
    private ?ContainerContract $previousContainer = null;

    private ?ApplicationContract $previousFacadeApp = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->previousContainer = Container::getInstance();
        $this->previousFacadeApp = Facade::getFacadeApplication();

        $app = new Application;
        Container::setInstance($app);
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($app);
    }

    protected function tearDown(): void
    {
        Facade::clearResolvedInstances();
        Facade::setFacadeApplication($this->previousFacadeApp);
        Container::setInstance($this->previousContainer);
        Mockery::close();

        parent::tearDown();
    }

    public function test_authorize_permite_quando_usuario_tem_modulos_atualizar(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('hasPermissionTo')
            ->once()
            ->with('modulos.atualizar')
            ->andReturn(true);

        $authMock = Mockery::mock();
        $authMock->shouldReceive('user')
            ->once()
            ->andReturn($user);
        Auth::swap($authMock);

        $request = new UpdateModuloRequest;

        $this->assertTrue($request->authorize());
    }

    public function test_authorize_nega_quando_usuario_nao_tem_modulos_atualizar(): void
    {
        $user = Mockery::mock(User::class);
        $user->shouldReceive('hasPermissionTo')
            ->once()
            ->with('modulos.atualizar')
            ->andReturn(false);

        $authMock = Mockery::mock();
        $authMock->shouldReceive('user')
            ->once()
            ->andReturn($user);
        Auth::swap($authMock);

        $request = new UpdateModuloRequest;

        $this->assertFalse($request->authorize());
    }

    public function test_authorize_nega_quando_nao_ha_usuario_autenticado(): void
    {
        $authMock = Mockery::mock();
        $authMock->shouldReceive('user')
            ->once()
            ->andReturn(null);
        Auth::swap($authMock);

        $request = new UpdateModuloRequest;

        $this->assertFalse($request->authorize());
    }
}
