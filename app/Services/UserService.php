<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Agenda;
use App\Models\Instituicao;
use App\Models\Setor;
use App\Models\User;
use App\Notifications\UserAssignedAsManagerNotification;
use App\Notifications\UserRemovedAsManagerNotification;
use App\Repositories\PermissionRepositoryInterface;
use App\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\PermissionRegistrar;

class UserService
{
    public function __construct(
        protected UserRepositoryInterface $repoUser,
        protected PermissionRepositoryInterface $repoPermission,
        protected ExclusaoDeContaService $exclusaoDeConta,
    ) {}

    /**
     * Returns all users belonging to the given institution with their sector relation.
     *
     * @return Collection<int, User>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->repoUser->getAllByInstituicao($instituicaoId);
    }

    /**
     * Returns all data needed to render the admin users index page.
     *
     * @return array<string, mixed>
     */
    public function getIndexData(User $authUser, ?string $search = null, ?int $setorId = null, bool $apenasAnonimizados = false): array
    {
        $instituicaoId = $authUser->setor->unidade->instituicao_id;

        /** @var LengthAwarePaginator<int, User> $users */
        $users = $this->repoUser->getPaginatedForAdminByInstituicao($instituicaoId, $search, $setorId, $apenasAnonimizados);
        $users->through(fn (User $user) => array_merge($user->toArray(), [
            'name' => $user->name,
            'roles' => $user->getRoleNames(),
            'anonimizado' => $user->estaAnonimizado(),
        ]));
        $users->withQueryString();
        $setores = Setor::select(['id', 'sigla'])->orderBy('sigla')->get();

        return [
            'users' => $users,
            'setores' => $setores,
            'filters' => ['search' => $search, 'setor_id' => $setorId, 'anonimizados' => $apenasAnonimizados],
        ];
    }

    /**
     * Returns everything the permission modal needs for a single user.
     *
     * Fica fora do index de propósito: a árvore de instituições e as agendas do
     * usuário só fazem sentido quando o modal de permissões abre, e carregá-las
     * na listagem custava segundos por request.
     *
     * @return array<string, mixed>
     */
    public function getPermissionContext(User $user): array
    {
        $user = $this->repoUser->getWithPermissionContext($user->id);

        return [
            'user' => array_merge($user->toArray(), [
                'roles' => $user->getRoleNames(),
                'permissions' => $user->getAllPermissions()->pluck('name'),
                'direct_permissions' => $user->getDirectPermissions()->pluck('name'),
            ]),
            'instituicoes' => Instituicao::select(['id', 'nome', 'sigla'])
                ->with([
                    'unidades:id,nome,instituicao_id',
                    'unidades.modulos:id,nome,unidade_id',
                    'unidades.modulos.andars:id,nome,modulo_id',
                    'unidades.modulos.andars.espacos:id,nome,capacidade_pessoas,andar_id',
                    'unidades.modulos.andars.espacos.agendas:id,turno,espaco_id',
                ])
                ->get(),
            'permissionCatalog' => $this->repoPermission->getAllGroupedByPrefix(),
        ];
    }

    /**
     * Sends the email verification notification to the given user, for an admin to trigger on their behalf.
     */
    public function resendVerificationEmail(User $user): void
    {
        if ($user->hasVerifiedEmail()) {
            throw new \RuntimeException('Este e-mail já está verificado.');
        }

        $user->sendEmailVerificationNotification();
    }

    /**
     * Sends a password reset link to the given user's email, for an admin to trigger on their behalf.
     */
    public function sendPasswordResetLink(User $user): bool
    {
        try {
            return Password::sendResetLink(['email' => $user->email]) === Password::RESET_LINK_SENT;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }

    /**
     * Updates the permission type and agenda assignments for a user.
     *
     * Usuário com mais de um papel (ex.: comum + gestor) não perde papéis: o acúmulo
     * depende da decisão B44 pendente, então só as agendas são tratadas quando ele é gestor.
     * Notificações de gestor saem só em transição real, depois do commit.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePermissions(User $user, array $data): void
    {
        $agendaIds = array_values((array) ($data['agendas'] ?? []));

        $transicao = DB::transaction(function () use ($user, $data, $agendaIds): array {
            $papeisAtuais = $user->roles()->pluck('name')->all();
            $agendasAtuais = Agenda::where('user_id', $user->id)->pluck('id')->all();

            $resultado = count($papeisAtuais) > 1
                ? $this->atualizarAgendasDeUsuarioComPapeisAcumulados($user, $papeisAtuais, $agendasAtuais, $agendaIds)
                : $this->atualizarPapelUnico($user, $data['role_name'], $papeisAtuais, $agendasAtuais, $agendaIds);

            if (array_key_exists('direct_permissions', $data)) {
                $user->syncPermissions($data['direct_permissions']);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();

            return $resultado;
        });

        if ($transicao['atribuido']) {
            $this->notificarAtribuicaoComoGestor($user);
        }

        if ($transicao['removido']) {
            $this->notificarRemocaoComoGestor($user);
        }
    }

    /**
     * @param  array<int, mixed>  $papeisAtuais
     * @param  array<int, mixed>  $agendasAtuais
     * @param  array<int, mixed>  $agendaIds
     * @return array{atribuido: bool, removido: bool}
     */
    private function atualizarPapelUnico(User $user, mixed $novoPapel, array $papeisAtuais, array $agendasAtuais, array $agendaIds): array
    {
        $eraGestor = in_array('gestor', $papeisAtuais, true) || $agendasAtuais !== [];

        $user->syncRoles([$novoPapel]);

        if ($novoPapel !== 'gestor') {
            Agenda::where('user_id', $user->id)->update(['user_id' => null]);

            return ['atribuido' => false, 'removido' => $eraGestor];
        }

        $ganhouAgenda = $this->possuiAgendaNova($agendaIds, $agendasAtuais);
        $virouGestor = ! in_array('gestor', $papeisAtuais, true);

        $this->sincronizarAgendasDoGestor($user, $agendasAtuais, $agendaIds);

        return ['atribuido' => $virouGestor || $ganhouAgenda, 'removido' => false];
    }

    /**
     * @param  array<int, mixed>  $papeisAtuais
     * @param  array<int, mixed>  $agendasAtuais
     * @param  array<int, mixed>  $agendaIds
     * @return array{atribuido: bool, removido: bool}
     */
    private function atualizarAgendasDeUsuarioComPapeisAcumulados(User $user, array $papeisAtuais, array $agendasAtuais, array $agendaIds): array
    {
        if (! in_array('gestor', $papeisAtuais, true)) {
            return ['atribuido' => false, 'removido' => false];
        }

        $ganhouAgenda = $this->possuiAgendaNova($agendaIds, $agendasAtuais);

        $this->sincronizarAgendasDoGestor($user, $agendasAtuais, $agendaIds);

        return ['atribuido' => $ganhouAgenda, 'removido' => false];
    }

    /**
     * @param  array<int, mixed>  $agendasAtuais
     * @param  array<int, mixed>  $agendaIds
     */
    private function sincronizarAgendasDoGestor(User $user, array $agendasAtuais, array $agendaIds): void
    {
        $desvincular = array_filter($agendasAtuais, fn (mixed $id): bool => ! in_array($id, $agendaIds));
        if ($desvincular !== []) {
            Agenda::whereIn('id', $desvincular)->update(['user_id' => null]);
        }

        if ($agendaIds !== []) {
            Agenda::whereIn('id', $agendaIds)->update(['user_id' => $user->id]);
        }
    }

    /**
     * @param  array<int, mixed>  $agendaIds
     * @param  array<int, mixed>  $agendasAtuais
     */
    private function possuiAgendaNova(array $agendaIds, array $agendasAtuais): bool
    {
        return array_filter($agendaIds, fn (mixed $id): bool => ! in_array($id, $agendasAtuais)) !== [];
    }

    private function notificarAtribuicaoComoGestor(User $user): void
    {
        try {
            $user->notify(new UserAssignedAsManagerNotification($user));
        } catch (\Exception $e) {
            Log::warning('Falha ao notificar usuário sobre atribuição como gestor', [
                'user_id' => $user->id,
                'exception' => $e,
            ]);
        }
    }

    private function notificarRemocaoComoGestor(User $user): void
    {
        try {
            $user->notify(new UserRemovedAsManagerNotification($user));
        } catch (\Exception $e) {
            Log::warning('Falha ao notificar usuário sobre remoção como gestor', [
                'user_id' => $user->id,
                'exception' => $e,
            ]);
        }
    }

    /**
     * Creates and persists a new user.
     *
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): User
    {
        return $this->repoUser->store($data);
    }

    /**
     * Updates an existing user with the given data.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(User $user, array $data): User
    {
        $data['telefone'] = $data['phone'] ?? $user->telefone;
        unset($data['phone']);

        return $this->repoUser->update($data, $user->id);
    }

    public function anonimizar(User $user): void
    {
        $this->exclusaoDeConta->anonimizar($user);
    }
}
