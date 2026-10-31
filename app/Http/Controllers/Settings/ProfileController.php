<?php

declare(strict_types=1);

namespace App\Http\Controllers\Settings;

use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Http\Controllers\Controller;
use App\Http\Requests\DeleteProfileRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Instituicao;
use App\Services\ExclusaoDeContaService;
use App\Services\ProcessadorDeFotoDePerfil;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
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

    public function update(ProfileUpdateRequest $request, ProcessadorDeFotoDePerfil $processadorDeFoto): RedirectResponse
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
        $foto = $request->file('photo');

        if ($foto instanceof UploadedFile) {
            $novaFotoPath = $processadorDeFoto->armazenar($foto);

            if ($novaFotoPath === null) {
                throw ValidationException::withMessages([
                    'photo' => __('The uploaded image could not be processed. Please send another file.'),
                ]);
            }

            if ($currentPhotoPath) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            $user->profile_pic = $novaFotoPath;
        } elseif ($request->boolean('remove_photo')) {
            if ($currentPhotoPath) {
                Storage::disk('public')->delete($currentPhotoPath);
            }

            $user->profile_pic = '';
        }

        $user->save();

        return to_route('settings.profile.edit');
    }

    public function destroy(DeleteProfileRequest $request, ExclusaoDeContaService $exclusaoDeConta): RedirectResponse
    {
        $user = $request->user() ?? throw new AuthenticationException;

        try {
            $exclusaoDeConta->anonimizar($user);
        } catch (ContaNaoPodeSerAnonimizadaException $e) {
            return back()->withErrors(['password' => $e->getMessage()]);
        }

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Inertia::clearHistory();

        return redirect('/');
    }
}
