<?php

declare(strict_types=1);

namespace App\Repositories;

use Carbon\CarbonInterface;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class RetencaoRepositoryDb implements RetencaoRepositoryInterface
{
    public function contarNotificacoesLidasAntesDe(CarbonInterface $corte): int
    {
        return $this->notificacoesLidasAntesDe($corte)->count();
    }

    public function apagarNotificacoesLidasAntesDe(CarbonInterface $corte): int
    {
        return $this->notificacoesLidasAntesDe($corte)->delete();
    }

    public function contarCacheExpiradoAntesDe(int $corteUnix): int
    {
        return array_sum(array_map(
            fn (Builder $consulta): int => $consulta->count(),
            $this->consultasDeCacheExpiradoAntesDe($corteUnix),
        ));
    }

    public function apagarCacheExpiradoAntesDe(int $corteUnix): int
    {
        return array_sum(array_map(
            fn (Builder $consulta): int => $consulta->delete(),
            $this->consultasDeCacheExpiradoAntesDe($corteUnix),
        ));
    }

    public function contarSessoesInativasAntesDe(int $corteUnix): int
    {
        return $this->sessoesInativasAntesDe($corteUnix)->count();
    }

    public function apagarSessoesInativasAntesDe(int $corteUnix): int
    {
        return $this->sessoesInativasAntesDe($corteUnix)->delete();
    }

    public function contarTokensRedefinicaoAntesDe(CarbonInterface $corte): int
    {
        return $this->tokensRedefinicaoAntesDe($corte)->count();
    }

    public function apagarTokensRedefinicaoAntesDe(CarbonInterface $corte): int
    {
        return $this->tokensRedefinicaoAntesDe($corte)->delete();
    }

    public function contarTokensRedefinicaoSemData(): int
    {
        return DB::table('password_reset_tokens')
            ->whereNull('created_at')
            ->count();
    }

    public function contarJobsPendentesAntesDe(int $corteUnix): int
    {
        return DB::table('jobs')
            ->where('created_at', '<', $corteUnix)
            ->count();
    }

    public function justificativasDeConflitoAposId(int $aposId, int $tamanho): array
    {
        $linhas = [];

        $consulta = DB::table('horarios')
            ->select(['id', 'justificativa'])
            ->where('id', '>', $aposId)
            ->where('justificativa', 'like', 'Conflito com a reserva %')
            ->orderBy('id')
            ->limit($tamanho)
            ->get();

        foreach ($consulta as $linha) {
            $linhas[] = [
                'id' => (int) $linha->id,
                'justificativa' => (string) $linha->justificativa,
            ];
        }

        return $linhas;
    }

    public function substituirJustificativas(array $ids, string $texto): int
    {
        return DB::table('horarios')
            ->whereIn('id', $ids)
            ->update(['justificativa' => $texto]);
    }

    private function notificacoesLidasAntesDe(CarbonInterface $corte): Builder
    {
        return DB::table('notifications')
            ->whereNotNull('read_at')
            ->where('read_at', '<', $corte);
    }

    /**
     * @return list<Builder>
     */
    private function consultasDeCacheExpiradoAntesDe(int $corteUnix): array
    {
        $loja = config('cache.stores.database');
        $loja = is_array($loja) ? $loja : [];

        $conexaoCache = $this->conexaoOuPadrao($loja['connection'] ?? null);
        $conexaoLock = $this->conexaoOuPadrao($loja['lock_connection'] ?? null) ?? $conexaoCache;

        return [
            DB::connection($conexaoCache)
                ->table($this->nomeOuPadrao($loja['table'] ?? null, 'cache'))
                ->where('expiration', '<', $corteUnix),
            DB::connection($conexaoLock)
                ->table($this->nomeOuPadrao($loja['lock_table'] ?? null, 'cache_locks'))
                ->where('expiration', '<', $corteUnix),
        ];
    }

    private function tokensRedefinicaoAntesDe(CarbonInterface $corte): Builder
    {
        return DB::table('password_reset_tokens')
            ->whereNotNull('created_at')
            ->where('created_at', '<', $corte);
    }

    private function sessoesInativasAntesDe(int $corteUnix): Builder
    {
        return DB::connection($this->conexaoOuPadrao(config('session.connection')))
            ->table($this->nomeOuPadrao(config('session.table'), 'sessions'))
            ->where('last_activity', '<', $corteUnix);
    }

    private function conexaoOuPadrao(mixed $valor): ?string
    {
        return is_string($valor) && $valor !== '' ? $valor : null;
    }

    private function nomeOuPadrao(mixed $valor, string $padrao): string
    {
        return is_string($valor) && $valor !== '' ? $valor : $padrao;
    }
}
