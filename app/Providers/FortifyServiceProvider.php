<?php

declare(strict_types=1);

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use App\Http\Responses\CustomLoginResponse;
use App\Http\Responses\CustomLogoutResponse;
use App\Http\Responses\CustomVerifyEmailResponse;
use App\Http\Responses\NeutralPasswordResetLinkResponse;
use App\Models\Instituicao;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Contracts\FailedPasswordResetLinkRequestResponse as FailedPasswordResetLinkRequestResponseContract;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Contracts\SuccessfulPasswordResetLinkRequestResponse as SuccessfulPasswordResetLinkRequestResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    private const LIMITADORES_DE_ROTA = [
        'register.store' => 'register',
        'password.email' => 'forgot-password',
        'password.update' => 'reset-password',
        'password.confirm.store' => 'confirm-password',
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind your custom VerifyEmailResponse
        $this->app->singleton(VerifyEmailResponseContract::class, CustomVerifyEmailResponse::class);

        // Bind your custom LoginResponse
        $this->app->singleton(LoginResponseContract::class, CustomLoginResponse::class);

        $this->app->singleton(LogoutResponseContract::class, CustomLogoutResponse::class);

        $this->app->singleton(FailedPasswordResetLinkRequestResponseContract::class, NeutralPasswordResetLinkResponse::class);
        $this->app->singleton(SuccessfulPasswordResetLinkRequestResponseContract::class, NeutralPasswordResetLinkResponse::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);

        // Tell Fortify to render Inertia views for standard authentication pages
        Fortify::loginView(function () {
            return Inertia::render('auth/login', [ // Updated to lowercase based on convention
                'canResetPassword' => Route::has('password.request'),
                'status' => session('status'),
            ]);
        });

        Fortify::registerView(function () {
            $instituicaos = Instituicao::with(['setors.unidade'])->get();

            return Inertia::render('auth/register', [
                'instituicaos' => $instituicaos,
            ]);
        });

        Fortify::requestPasswordResetLinkView(function () {
            return Inertia::render('auth/forgot-password', [
                'status' => session('status'),
            ]);
        });

        Fortify::resetPasswordView(function (Request $request) {
            return Inertia::render('auth/reset-password', [
                'email' => $request->input('email'),
                'token' => $request->route('token'),
            ]);
        });

        Fortify::verifyEmailView(function () {
            return Inertia::render('auth/verify-email', [
                'status' => session('status'),
            ]);
        });

        Fortify::confirmPasswordView(function () {
            return Inertia::render('auth/confirm-password');
        });

        // Explicitly define where to redirect after email verification
        Fortify::redirects('email-verification', '/dashboard?verified=1');

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(10)->by('register|'.$request->ip());
        });

        RateLimiter::for('forgot-password', function (Request $request) {
            return $this->limitesPorIpEEmail('forgot-password', $request, porIp: 5, porEmail: 3);
        });

        RateLimiter::for('reset-password', function (Request $request) {
            return $this->limitesPorIpEEmail('reset-password', $request, porIp: 10, porEmail: 5);
        });

        RateLimiter::for('confirm-password', function (Request $request) {
            $identificador = $request->user()?->getAuthIdentifier();

            return Limit::perMinute(5)->by('confirm-password|'.(is_scalar($identificador) ? $identificador : $request->ip()));
        });

        $this->app->booted(function (): void {
            foreach (Route::getRoutes()->getRoutes() as $rota) {
                $limitador = self::LIMITADORES_DE_ROTA[$rota->getName() ?? ''] ?? null;

                if ($limitador !== null) {
                    $rota->middleware('throttle:'.$limitador);
                }
            }
        });
    }

    /**
     * @return list<Limit>
     */
    private function limitesPorIpEEmail(string $nome, Request $request, int $porIp, int $porEmail): array
    {
        $limites = [Limit::perMinute($porIp)->by($nome.'|ip|'.$request->ip())];

        $email = $request->input(Fortify::email());

        if (is_string($email) && $email !== '') {
            $limites[] = Limit::perMinute($porEmail)->by($nome.'|email|'.Str::transliterate(Str::lower($email)));
        }

        return $limites;
    }
}
