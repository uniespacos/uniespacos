<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\StoreRegisterRequest;
use App\Models\Instituicao;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('auth/register', [
            'instituicaos' => Instituicao::with(['unidades.setors'])->get(),
        ]);
    }

    public function store(StoreRegisterRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'telefone' => $validated['phone'] ?? 'XX XXXXXXXXX',
            'profile_pic' => '',
            'setor_id' => $validated['setor_id'],
        ]);

        $user->assignRole('comum');

        event(new Registered($user));

        Auth::login($user);

        return to_route('dashboard');
    }
}
