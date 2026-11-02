<?php

declare(strict_types=1);

namespace App\Services;

use App\Repositories\RetencaoRepositoryInterface;
use Carbon\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class RetencaoService
{
    private const PADRAO_LOG_DIARIO = '/^laravel-(\d{4})-(\d{2})-(\d{2})\.log\z/';

    public function __construct(
        protected RetencaoRepositoryInterface $repo,
    ) {}

    /**
     * Retorna null quando a rotina é pulada por prazo inválido.
     */
    public function notificacoesLidas(bool $simular = false): ?int
    {
        $dias = $this->diasValidos('notificacoes_lidas_dias', config('retencao.notificacoes_lidas_dias'));

        if ($dias === null) {
            return null;
        }

        $corte = now()->subDays($dias);

        return $simular
            ? $this->repo->contarNotificacoesLidasAntesDe($corte)
            : $this->repo->apagarNotificacoesLidasAntesDe($corte);
    }

    /**
     * Conta ou apaga apenas entradas já expiradas há mais de `cache_dias`, em cache e em cache_locks.
     */
    public function cache(bool $simular = false): ?int
    {
        $dias = $this->diasValidos('cache_dias', config('retencao.cache_dias'));

        if ($dias === null) {
            return null;
        }

        $corteUnix = now()->subDays($dias)->getTimestamp();

        return $simular
            ? $this->repo->contarCacheExpiradoAntesDe($corteUnix)
            : $this->repo->apagarCacheExpiradoAntesDe($corteUnix);
    }

    public function sessoes(bool $simular = false): ?int
    {
        $dias = $this->diasValidos('sessoes_dias', config('retencao.sessoes_dias'));

        if ($dias === null) {
            return null;
        }

        $corteUnix = now()->subDays($dias)->getTimestamp();

        return $simular
            ? $this->repo->contarSessoesInativasAntesDe($corteUnix)
            : $this->repo->apagarSessoesInativasAntesDe($corteUnix);
    }

    /**
     * Apaga `laravel-AAAA-MM-DD.log` com data anterior a hoje − N dias, N de logging.channels.daily.days.
     * A decisão usa só a data do nome do arquivo, nunca o mtime.
     */
    public function logs(bool $simular = false): ?int
    {
        $dias = $this->diasValidos('logs_diarios', config('logging.channels.daily.days'));

        if ($dias === null) {
            return null;
        }

        $diretorio = config('retencao.logs.diretorio');

        if (! is_string($diretorio) || ! File::isDirectory($diretorio)) {
            return 0;
        }

        $corte = now()->startOfDay()->subDays($dias);
        $removidos = 0;

        foreach (File::files($diretorio) as $arquivo) {
            $data = $this->dataDoLogDiario($arquivo->getFilename());

            if ($data === null || ! $data->lessThan($corte)) {
                continue;
            }

            if ($simular) {
                $removidos++;

                continue;
            }

            if (File::delete($arquivo->getPathname())) {
                $removidos++;
            }
        }

        return $removidos;
    }

    /**
     * Horas para os comandos `queue:prune-*`, derivadas de um prazo em dias.
     */
    public function horasDeRetencao(string $chave): ?int
    {
        $dias = $this->diasValidos($chave, config("retencao.{$chave}"));

        return $dias === null ? null : $dias * 24;
    }

    private function diasValidos(string $rotina, mixed $valor): ?int
    {
        $dias = filter_var($valor, FILTER_VALIDATE_INT);

        if (is_int($dias) && $dias > 0) {
            return $dias;
        }

        Log::warning('retencao.rotina_pulada', ['rotina' => $rotina, 'motivo' => 'prazo_invalido']);

        return null;
    }

    private function dataDoLogDiario(string $nome): ?Carbon
    {
        if (preg_match(self::PADRAO_LOG_DIARIO, $nome, $partes) !== 1) {
            return null;
        }

        $ano = (int) $partes[1];
        $mes = (int) $partes[2];
        $dia = (int) $partes[3];

        if (! checkdate($mes, $dia, $ano)) {
            return null;
        }

        return Carbon::create($ano, $mes, $dia, 0, 0, 0);
    }
}
