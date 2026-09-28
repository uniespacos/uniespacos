<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;

class UserRepositoryEloquent implements UserRepositoryInterface
{
    public function __construct(
        protected User $user,
    ) {}

    /**
     * Stores a new instance of User in the database
     */
    public function store(array $data): User
    {
        return $this->user->create($data);
    }

    /**
     * Returns all instances of User from the database
     *
     * @param  array<array>|null  $filters
     * @return Collection<int, User>
     */
    public function getList(array $columns = ['*'], ?array $filters = null): Collection
    {
        $query = $this->user->newQuery();

        if ($filters) {
            $query->where($filters);
        }

        return $query->get($columns);
    }

    /**
     * Returns all User records belonging to the given Instituicao with eager-loaded relations
     *
     * @return Collection<int, User>
     */
    public function getAllByInstituicao(int $instituicaoId): Collection
    {
        return $this->user
            ->whereHas('setor.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['setor'])
            ->get();
    }

    /**
     * Returns all User records belonging to the given Instituicao including their agendas
     *
     * @return Collection<int, User>
     */
    public function getAllWithAgendasByInstituicao(int $instituicaoId): Collection
    {
        return $this->user
            ->whereHas('setor.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->with(['agendas', 'setor'])
            ->get();
    }

    /**
     * Returns a paginated list of User records for the admin index page.
     *
     * Carrega apenas o que o card da listagem realmente desenha (nome, e-mail,
     * telefone, selo de verificação e o papel). Agendas, permissões e a cadeia
     * de localização NÃO entram aqui: são exclusivas do modal de permissões e
     * chegam sob demanda via getWithPermissionContext() para um único usuário.
     */
    public function getPaginatedForAdminByInstituicao(int $instituicaoId, ?string $search, ?int $setorId, int $perPage = 10): LengthAwarePaginator
    {
        return $this->user
            ->select(['id', 'name', 'email', 'telefone', 'email_verified_at', 'setor_id'])
            ->whereHas('setor.unidade', fn ($q) => $q->where('instituicao_id', $instituicaoId))
            ->when($search, fn ($q) => $q->where(
                fn ($q2) => $q2->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")
            ))
            ->when($setorId, fn ($q) => $q->where('setor_id', $setorId))
            ->with('roles:id,name')
            ->orderBy('name')
            ->paginate($perPage);
    }

    /**
     * Returns a single User with everything the permission modal needs:
     * current agendas (with their full location chain) and permission sets.
     */
    public function getWithPermissionContext(int|string $id): ?User
    {
        return $this->user
            ->with([
                'agendas.espaco.andar.modulo.unidade.instituicao',
                'roles.permissions',
                'permissions',
            ])
            ->find($id);
    }

    /**
     * Returns an instance of User from the given id
     */
    public function get(int|string $id): ?User
    {
        return $this->user->find($id);
    }

    /**
     * Updates the data of an instance of User
     */
    public function update(array $data, int|string $id): User
    {
        $user = $this->user->findOrFail($id);
        $user->update($data);

        return $user;
    }

    /**
     * Removes an instance of User from the database
     */
    public function destroy(int|string $id): bool
    {
        return (bool) $this->user->findOrFail($id)->delete();
    }
}
