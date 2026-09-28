<?php

declare(strict_types=1);

namespace App\Services\Relatorio;

use App\Enums\Relatorio\FormatoRelatorioEnum;
use App\Enums\Relatorio\TipoRelatorioEnum;
use App\Models\Espaco;
use App\Models\User;
use App\Policies\RelatorioPolicy;
use App\Services\Relatorio\Data\DadosRelatorio;
use App\Services\Relatorio\Data\FiltrosRelatorio;
use App\Services\Relatorio\Exporters\ExporterFactory;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class RelatorioService
{
    public function __construct(
        private RelatorioFactory $relatorios,
        private ExporterFactory $exporters,
    ) {}

    public function gerar(User $usuario, TipoRelatorioEnum $tipo, FormatoRelatorioEnum $formato, FiltrosRelatorio $filtros): BinaryFileResponse|StreamedResponse
    {
        $dados = $this->agregarComCache($usuario, $tipo, $filtros);

        $this->validarLimites($dados, $formato);

        $nomeArquivo = sprintf('%s-%s.%s', $tipo->value, now()->format('Ymd-His'), $formato->value);

        return $this->exporters->make($formato)->exportar($dados, $nomeArquivo);
    }

    /**
     * Agrega dados com cache automático.
     *
     * Chave de cache: relatorio:{tipo}:{usuario_id}:v{versao}:{hash_filtros}
     * TTL: configurável via relatorios.cache_ttl (padrão 30 minutos)
     */
    public function agregarComCache(User $usuario, TipoRelatorioEnum $tipo, FiltrosRelatorio $filtros): DadosRelatorio
    {
        if (! $usuario->hasPermissionTo($tipo->permissao())) {
            abort(403, 'Tipo de relatório não disponível para este perfil.');
        }

        $filtros = $this->aplicarEscopo($usuario, $filtros);

        $cacheKey = $this->gerarCacheKey($tipo, $usuario->id, $filtros);
        $cacheTtl = (int) config('relatorios.cache_ttl', 1800);

        return Cache::remember($cacheKey, $cacheTtl, function () use ($usuario, $tipo, $filtros) {
            Log::info('Agregando relatório (cache miss)', [
                'tipo' => $tipo->value,
                'usuario_id' => $usuario->id,
            ]);

            return $this->relatorios->make($tipo)->gerar($usuario, $filtros);
        });
    }

    /**
     * Invalida cache de relatórios quando dados mudam.
     *
     * Estratégia de versionamento monótono: incrementa versão por tipo ou tipo+usuarioId.
     * Versões são persistentes (nunca expiram), garantindo que cache-busting sempre funcione
     * independentemente do TTL dos dados agregados.
     */
    public function invalidarCacheDoTipo(TipoRelatorioEnum $tipo, ?int $usuarioId = null): void
    {
        if ($usuarioId !== null) {
            $versionKey = "relatorio_version:{$tipo->value}:{$usuarioId}";
            $novaVersao = ((int) (Cache::get($versionKey) ?? 1)) + 1;
            Cache::forever($versionKey, $novaVersao);

            Log::info('Cache de relatório invalidado (usuário específico)', [
                'tipo' => $tipo->value,
                'usuario_id' => $usuarioId,
                'nova_versao' => $novaVersao,
            ]);
        } else {
            $versionKey = "relatorio_version:{$tipo->value}";
            $novaVersao = ((int) (Cache::get($versionKey) ?? 1)) + 1;
            Cache::forever($versionKey, $novaVersao);

            Log::info('Cache de relatório invalidado (global)', [
                'tipo' => $tipo->value,
                'nova_versao' => $novaVersao,
            ]);
        }
    }

    public function agregar(User $usuario, TipoRelatorioEnum $tipo, FiltrosRelatorio $filtros): DadosRelatorio
    {
        if (! $usuario->hasPermissionTo($tipo->permissao())) {
            abort(403, 'Tipo de relatório não disponível para este perfil.');
        }

        $filtros = $this->aplicarEscopo($usuario, $filtros);

        return $this->relatorios->make($tipo)->gerar($usuario, $filtros);
    }

    /**
     * Opcoes de localizacao para os filtros do inventario, ja restritas ao
     * escopo do usuario. Cada nivel carrega a chave do pai para permitir o
     * encadeamento dos comboboxes no frontend.
     *
     * @return array{
     *     unidades: array<int, array{id: int, nome: string}>,
     *     modulos: array<int, array{id: int, nome: string, unidade_id: int}>,
     *     andares: array<int, array{id: int, nome: string, modulo_id: int}>,
     *     espacos: array<int, array{id: int, nome: string, andar_id: int}>
     * }
     */
    public function opcoesInventario(User $usuario): array
    {
        $espacosQuery = Espaco::query()->with('andar.modulo.unidade');

        $escopo = Gate::forUser($usuario)->raw('aplicarEscopoParaUsuario')
            ?? app(RelatorioPolicy::class)->aplicarEscopoParaUsuario($usuario);

        if (empty($escopo)) {
            abort(403, 'Sem permissão para acessar relatórios.');
        }

        if (($escopo['tipo'] ?? null) === 'institucional') {
            $instituicaoId = $escopo['instituicaoId'] ?? null;
            $espacosQuery->whereHas(
                'andar.modulo.unidade',
                fn ($u) => $u->where('instituicao_id', $instituicaoId)
            );
        } elseif (($escopo['tipo'] ?? null) === 'gestor') {
            $agendaIds = $escopo['agendaIds'] ?? [];
            $espacosQuery->whereHas('agendas', fn ($q) => $q->whereIn('id', $agendaIds));
        } else {
            abort(403, 'Sem permissão para acessar relatórios.');
        }

        $espacos = $espacosQuery->get()->filter(
            fn (Espaco $espaco) => $espaco->andar?->modulo?->unidade !== null
        );

        $unidades = [];
        $modulos = [];
        $andares = [];
        $listaEspacos = [];

        foreach ($espacos as $espaco) {
            $andar = $espaco->andar;
            $modulo = $andar->modulo;
            $unidade = $modulo->unidade;

            $unidades[$unidade->id] = ['id' => $unidade->id, 'nome' => $unidade->nome];
            $modulos[$modulo->id] = [
                'id' => $modulo->id,
                'nome' => $modulo->nome,
                'unidade_id' => $unidade->id,
            ];
            $andares[$andar->id] = [
                'id' => $andar->id,
                'nome' => $andar->nome,
                'modulo_id' => $modulo->id,
            ];
            $listaEspacos[$espaco->id] = [
                'id' => $espaco->id,
                'nome' => $espaco->nome,
                'andar_id' => $andar->id,
            ];
        }

        $ordenarPorNome = function (array $itens): array {
            usort($itens, fn ($a, $b) => strnatcasecmp($a['nome'], $b['nome']));

            return $itens;
        };

        return [
            'unidades' => $ordenarPorNome(array_values($unidades)),
            'modulos' => $ordenarPorNome(array_values($modulos)),
            'andares' => $ordenarPorNome(array_values($andares)),
            'espacos' => $ordenarPorNome(array_values($listaEspacos)),
        ];
    }

    private function aplicarEscopo(User $usuario, FiltrosRelatorio $filtros): FiltrosRelatorio
    {
        $escopo = Gate::forUser($usuario)->raw('aplicarEscopoParaUsuario')
            ?? app(RelatorioPolicy::class)->aplicarEscopoParaUsuario($usuario);

        if (empty($escopo)) {
            abort(403, 'Sem permissão para acessar relatórios.');
        }

        if (($escopo['tipo'] ?? null) === 'institucional') {
            return new FiltrosRelatorio(
                dataInicio: $filtros->dataInicio,
                dataFim: $filtros->dataFim,
                situacoes: $filtros->situacoes,
                turnos: $filtros->turnos,
                instituicaoId: $escopo['instituicaoId'] ?? null,
                unidadeId: $filtros->unidadeId,
                moduloId: $filtros->moduloId,
                andarId: $filtros->andarId,
                espacoId: $filtros->espacoId,
                setorId: $filtros->setorId,
                agendaIds: $filtros->agendaIds,
            );
        }

        if (($escopo['tipo'] ?? null) === 'gestor') {
            return new FiltrosRelatorio(
                dataInicio: $filtros->dataInicio,
                dataFim: $filtros->dataFim,
                situacoes: $filtros->situacoes,
                turnos: $filtros->turnos,
                instituicaoId: null,
                unidadeId: null,
                moduloId: null,
                andarId: null,
                espacoId: $filtros->espacoId,
                setorId: null,
                agendaIds: $escopo['agendaIds'] ?? [],
            );
        }

        abort(403, 'Sem permissão para acessar relatórios.');
    }

    private function validarLimites(DadosRelatorio $dados, FormatoRelatorioEnum $formato): void
    {
        // O formato PDF gera um documento executivo/analítico de apresentação (máx 2-3 páginas)
        // com consolidação de KPIs e amostragem dos principais registros.
        if ($formato === FormatoRelatorioEnum::PDF) {
            return;
        }

        $totalLinhas = $dados->totalLinhas();
        $limite = (int) config('relatorios.limites.max_linhas_csv_xlsx', 10_000);

        if ($totalLinhas > $limite) {
            abort(422, "Relatório excede o limite de {$limite} linhas para este formato. Refine os filtros.");
        }
    }

    /**
     * Gera chave de cache determinística baseada em tipo, usuário e filtros pós-escopo.
     */
    private function gerarCacheKey(TipoRelatorioEnum $tipo, int $usuarioId, FiltrosRelatorio $filtros): string
    {
        $versaoGlobal = (int) (Cache::get("relatorio_version:{$tipo->value}") ?? 1);
        $versaoUsuario = (int) (Cache::get("relatorio_version:{$tipo->value}:{$usuarioId}") ?? 1);

        $situacoes = $filtros->situacoes;
        if (is_array($situacoes)) {
            sort($situacoes);
        }

        $turnos = $filtros->turnos;
        if (is_array($turnos)) {
            sort($turnos);
        }

        $agendaIds = $filtros->agendaIds;
        if (is_array($agendaIds)) {
            sort($agendaIds);
        }

        $filtrosJson = json_encode([
            'dataInicio' => $filtros->dataInicio?->toIso8601String(),
            'dataFim' => $filtros->dataFim?->toIso8601String(),
            'situacoes' => $situacoes,
            'turnos' => $turnos,
            'instituicaoId' => $filtros->instituicaoId,
            'unidadeId' => $filtros->unidadeId,
            'moduloId' => $filtros->moduloId,
            'andarId' => $filtros->andarId,
            'espacoId' => $filtros->espacoId,
            'setorId' => $filtros->setorId,
            'agendaIds' => $agendaIds,
        ]);

        $hashFiltros = hash('sha256', (string) $filtrosJson);

        return "relatorio:{$tipo->value}:{$usuarioId}:v{$versaoGlobal}.{$versaoUsuario}:{$hashFiltros}";
    }
}
