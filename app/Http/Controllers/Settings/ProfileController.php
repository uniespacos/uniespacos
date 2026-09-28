<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteProfileRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Instituicao;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            'instituicaos' => Instituicao::with(['setors.unidade'])->get(),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $user->fill([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'telefone' => $validated['phone'],
            'setor_id' => $validated['setor_id'],
        ]);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $currentPhotoPath = $user->getRawOriginal('profile_pic');

        if ($request->hasFile('photo')) {
            if ($currentPhotoPath) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            $user->profile_pic = $request->file('photo')->store('avatars', 'public');
        } elseif ($request->boolean('remove_photo')) {
            if ($currentPhotoPath) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            $user->profile_pic = '';
        }

        $user->save();

        return to_route('settings.profile.edit');
    }

    public function destroy(DeleteProfileRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
