<?php

declare(strict_types=1);

namespace Tests;

use Database\Factories\HorarioFactory;
use Database\Seeders\Production\PermissionSeeder;
use Database\Seeders\Production\RoleSeeder;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();

        if (method_exists($this, 'withoutVite')) {
            $this->withoutVite();
        }

        $this->withoutMiddleware(ValidateCsrfToken::class);

        $this->seed([
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);

        HorarioFactory::resetSequence();
    }
}
