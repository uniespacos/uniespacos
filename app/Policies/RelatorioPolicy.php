<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\User;

class RelatorioPolicy
{
    /**
     * Retorna os filtros de escopo aplicáveis ao usuário baseado em suas permissões.
     *
     * @return array{
     *     tipo: 'institucional'|'gestor',
     *     instituicaoId: int|null,
     *     unidadeId: int|null,
     *     agendaIds: array<int>,
     * }|array{}
     */
    public function aplicarEscopoParaUsuario(User $user): array
    {
        // Institucional: acesso a todas as agendas de sua instituição
        if ($user->can('relatorios.escopo-instituicao') || $user->can('secao.dashboard-institucional')) {
            return [
                'tipo' => 'institucional',
                'instituicaoId' => $user->setor?->unidade?->instituicao_id,
                'unidadeId' => null,
                'agendaIds' => [],
            ];
        }

        // Gestor: acesso apenas a suas agendas gerenciadas
        if ($user->can('relatorios.escopo-agendas') || $user->can('secao.dashboard-gestor') || $user->can('reservas.avaliar')) {
            return [
                'tipo' => 'gestor',
                'instituicaoId' => null,
                'unidadeId' => null,
                'agendaIds' => $user->agendas()->pluck('id')->all(),
            ];
        }

        // Fallback: acesso negado
        return [];
    }
}
