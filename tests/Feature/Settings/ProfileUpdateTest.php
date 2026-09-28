<?php

declare(strict_types=1);

namespace Tests\Feature\Settings;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use DatabaseTransactions;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get('/settings/profile');

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();
        $setor = Setor::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => 'test@example.com',
                'phone' => '77999999999',
                'setor_id' => $setor->id,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();
        $setor = Setor::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => 'Test User',
                'email' => $user->email,
                'phone' => '77999999999',
                'setor_id' => $setor->id,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_profile_photo_can_be_uploaded()
    {
        Storage::fake('public');

        $user = User::factory()->create(['profile_pic' => '']);
        $setor = Setor::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '77999999999',
                'setor_id' => $setor->id,
                'photo' => UploadedFile::fake()->image('avatar.jpg'),
            ]);

        $response->assertSessionHasNoErrors();

        $user->refresh();

        $this->assertNotEmpty($user->getRawOriginal('profile_pic'));
        Storage::disk('public')->assertExists($user->getRawOriginal('profile_pic'));
    }

    public function test_profile_photo_can_be_removed()
    {
        Storage::fake('public');
        $path = UploadedFile::fake()->image('avatar.jpg')->store('avatars', 'public');

        $user = User::factory()->create(['profile_pic' => $path]);
        $setor = Setor::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch('/settings/profile', [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => '77999999999',
                'setor_id' => $setor->id,
                'remove_photo' => true,
            ]);

        $response->assertSessionHasNoErrors();

        $this->assertSame('', $user->refresh()->getRawOriginal('profile_pic'));
        Storage::disk('public')->assertMissing($path);
    }

    public function test_user_can_delete_their_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->delete('/settings/profile', [
                'password' => 'password',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect('/');

        $this->assertGuest();
        $this->assertNull($user->fresh());
    }

    public function test_correct_password_must_be_provided_to_delete_account()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->from('/settings/profile')
            ->delete('/settings/profile', [
                'password' => 'wrong-password',
            ]);

        $response
            ->assertSessionHasErrors('password')
            ->assertRedirect('/settings/profile');

        $this->assertNotNull($user->fresh());
    }
}
