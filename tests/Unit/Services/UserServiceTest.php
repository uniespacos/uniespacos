<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\Agenda;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class UserServiceTest extends TestCase
{
    private UserService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(UserService::class);
    }

    public function test_update_translates_phone_to_telefone(): void
    {
        $user = User::factory()->create(['telefone' => '11999999999']);

        $updated = $this->service->update($user, [
            'phone' => '11988888888',
            'name' => 'New Name',
        ]);

        $this->assertSame('11988888888', $updated->telefone);
        $this->assertFalse(array_key_exists('phone', $updated->getAttributes()));

        $refreshed = User::find($user->id);
        $this->assertSame('11988888888', $refreshed->telefone);
    }

    public function test_update_preserves_telefone_when_phone_absent(): void
    {
        $user = User::factory()->create(['telefone' => '11999999999']);

        $updated = $this->service->update($user, [
            'name' => 'Updated Name',
        ]);

        $this->assertSame('11999999999', $updated->telefone);

        $refreshed = User::find($user->id);
        $this->assertSame('11999999999', $refreshed->telefone);
    }

    public function test_update_permissions_with_gestor_role_links_agendas(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $agenda1 = Agenda::factory()->create(['user_id' => null]);
        $agenda2 = Agenda::factory()->create(['user_id' => null]);
        $agenda3 = Agenda::factory()->create(['user_id' => null]);

        $this->service->updatePermissions($user, [
            'role_name' => 'gestor',
            'agendas' => [$agenda1->id, $agenda2->id],
        ]);

        $agenda1->refresh();
        $agenda2->refresh();
        $agenda3->refresh();

        $this->assertSame($user->id, $agenda1->user_id);
        $this->assertSame($user->id, $agenda2->user_id);
        $this->assertNull($agenda3->user_id);

        $user->refresh();
        $this->assertTrue($user->hasRole('gestor'));
    }

    public function test_update_permissions_with_gestor_unlinks_agenda_not_in_list(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $agenda1 = Agenda::factory()->create(['user_id' => null]);
        $agenda2 = Agenda::factory()->create(['user_id' => null]);
        $agenda3 = Agenda::factory()->create(['user_id' => null]);

        $this->service->updatePermissions($user, [
            'role_name' => 'gestor',
            'agendas' => [$agenda1->id, $agenda2->id, $agenda3->id],
        ]);

        $user->refresh();
        $this->assertTrue($user->hasRole('gestor'));

        $agenda1->refresh();
        $agenda2->refresh();
        $agenda3->refresh();

        $this->assertSame($user->id, $agenda1->user_id);
        $this->assertSame($user->id, $agenda2->user_id);
        $this->assertSame($user->id, $agenda3->user_id);

        $this->service->updatePermissions($user, [
            'role_name' => 'gestor',
            'agendas' => [$agenda1->id],
        ]);

        $agenda1->refresh();
        $agenda2->refresh();
        $agenda3->refresh();

        $this->assertSame($user->id, $agenda1->user_id);
        $this->assertNull($agenda2->user_id);
        $this->assertNull($agenda3->user_id);
    }

    public function test_update_permissions_with_non_gestor_role_unlinks_all_agendas(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $agenda1 = Agenda::factory()->create(['user_id' => null]);
        $agenda2 = Agenda::factory()->create(['user_id' => null]);
        $agenda3 = Agenda::factory()->create(['user_id' => null]);

        $this->service->updatePermissions($user, [
            'role_name' => 'gestor',
            'agendas' => [$agenda1->id, $agenda2->id, $agenda3->id],
        ]);

        $user->refresh();
        $this->assertTrue($user->hasRole('gestor'));

        $agenda1->refresh();
        $agenda2->refresh();
        $agenda3->refresh();

        $this->assertSame($user->id, $agenda1->user_id);
        $this->assertSame($user->id, $agenda2->user_id);
        $this->assertSame($user->id, $agenda3->user_id);

        $this->service->updatePermissions($user, [
            'role_name' => 'comum',
        ]);

        $user->refresh();
        $this->assertTrue($user->hasRole('comum'));
        $this->assertFalse($user->hasRole('gestor'));

        $agenda1->refresh();
        $agenda2->refresh();
        $agenda3->refresh();

        $this->assertNull($agenda1->user_id);
        $this->assertNull($agenda2->user_id);
        $this->assertNull($agenda3->user_id);
    }
}
