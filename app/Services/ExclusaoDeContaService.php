<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ContaNaoPodeSerAnonimizadaException;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExclusaoDeContaService
{
    public const NOME_ANONIMIZADO = 'Usuário anonimizado';

    private const PREFIXO_FOTO_LOCAL = 'avatars/';

    public function __construct(
        protected UserRepositoryInterface $repoUser,
        protected ReservaService $reservaService,
    ) {}

    public function anonimizar(User $user): void
    {
        if ($user->estaAnonimizado()) {
            return;
        }

        $emailOriginal = $user->email;
        $fotoLocal = $this->caminhoDaFotoLocal($user);

        $cancelamentos = DB::transaction(function () use ($user, $emailOriginal): array {
            if ($this->repoUser->temAgendaGerida($user)) {
                throw ContaNaoPodeSerAnonimizadaException::gestorDeAgenda();
            }

            $cancelamentos = $this->cancelarReservasPendentes($user);

            $this->repoUser->removerNotificacoes($user);
            $this->repoUser->removerFavoritos($user);
            $this->repoUser->removerPapeisEPermissoes($user);
            $this->repoUser->anonimizar($user, $this->atributosAnonimizados($user));
            $this->repoUser->removerSessoes($user);
            $this->repoUser->removerTokenDeRedefinicaoDeSenha($emailOriginal);

            return $cancelamentos;
        });

        $this->notificarCancelamentos($user, $cancelamentos);
        $this->apagarFotoLocal($user, $fotoLocal);
    }

    /**
     * @return list<array{reserva: Reserva, horariosLiberados: Collection<int, Horario>}>
     */
    private function cancelarReservasPendentes(User $user): array
    {
        $cancelamentos = [];

        foreach ($this->reservaService->pendentesDoSolicitante($user) as $reserva) {
            $cancelamentos[] = [
                'reserva' => $reserva,
                'horariosLiberados' => $this->reservaService->inativar($reserva),
            ];
        }

        return $cancelamentos;
    }

    /**
     * @param  list<array{reserva: Reserva, horariosLiberados: Collection<int, Horario>}>  $cancelamentos
     */
    private function notificarCancelamentos(User $user, array $cancelamentos): void
    {
        foreach ($cancelamentos as $cancelamento) {
            try {
                $this->reservaService->notificarCancelamento(
                    $cancelamento['reserva'],
                    $user,
                    $cancelamento['horariosLiberados'],
                );
            } catch (\Throwable $e) {
                Log::error('Falha ao concluir cancelamento de reserva pendente após anonimização', [
                    'user_id' => $user->id,
                    'reserva_id' => $cancelamento['reserva']->id,
                    'exception' => $e,
                ]);
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function atributosAnonimizados(User $user): array
    {
        return [
            'name' => self::NOME_ANONIMIZADO,
            'email' => User::emailAnonimizado($user->id),
            'password' => Str::random(64),
            'telefone' => '',
            'profile_pic' => '',
            'email_verified_at' => null,
            'remember_token' => null,
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ];
    }

    private function caminhoDaFotoLocal(User $user): ?string
    {
        $caminho = $user->getRawOriginal('profile_pic');

        if (! is_string($caminho) || ! str_starts_with($caminho, self::PREFIXO_FOTO_LOCAL)) {
            return null;
        }

        return $caminho;
    }

    private function apagarFotoLocal(User $user, ?string $caminho): void
    {
        if ($caminho === null) {
            return;
        }

        try {
            Storage::disk('public')->delete($caminho);
        } catch (\Throwable $e) {
            Log::warning('Falha ao remover a foto de perfil de conta anonimizada', [
                'user_id' => $user->id,
                'exception' => $e,
            ]);
        }
    }
}
