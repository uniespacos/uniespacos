<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Models\User;
use App\Repositories\AnonimizacaoDeBaseRepositoryInterface;
use App\Services\AnonimizacaoDeBaseService;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AnonimizacaoDeBaseServiceTest extends TestCase
{
    private const HASH = '$2y$04$hash-de-teste-para-anonimizacao';

    private const TEXTO_NEUTRO = 'Texto anonimizado.';

    private RepositorioDeAnonimizacaoEmMemoria $repo;

    private AnonimizacaoDeBaseService $service;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->repo = new RepositorioDeAnonimizacaoEmMemoria;
        $this->service = new AnonimizacaoDeBaseService($this->repo);
        $this->semearBase();
    }

    public function test_simular_conta_o_que_seria_alterado_sem_gravar(): void
    {
        $relatorio = $this->service->simular(semArquivos: true);

        $this->assertSame([], $this->repo->atualizacoes);
        $this->assertSame([], $this->repo->apagamentos);
        $this->assertSame(1, $this->quantidadeDe($relatorio, 'users'));
        $this->assertSame(2, $this->quantidadeDe($relatorio, 'reservas'));
        $this->assertSame('Fulano de Teste', $this->repo->linha('users', 1)['name']);
    }

    public function test_anonimiza_usuario_trocando_dados_pessoais_e_preservando_vinculos(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $usuario = $this->repo->linha('users', 1);

        $this->assertSame('Usuário 1', $usuario['name']);
        $this->assertSame('usuario1@anonimizado.test', $usuario['email']);
        $this->assertSame('(00) 00000-0000', $usuario['telefone']);
        $this->assertSame('', $usuario['profile_pic']);
        $this->assertSame(self::HASH, $usuario['password']);
        $this->assertNull($usuario['remember_token']);
        $this->assertNull($usuario['two_factor_secret']);
        $this->assertNull($usuario['two_factor_recovery_codes']);
        $this->assertNull($usuario['two_factor_confirmed_at']);
        $this->assertSame(7, $usuario['setor_id']);
        $this->assertSame('2026-01-02 00:00:00', $usuario['email_verified_at']);
    }

    public function test_email_anonimizado_nao_e_reconhecido_como_conta_da_exclusao(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $this->assertFalse((new User(['email' => 'usuario1@anonimizado.test']))->estaAnonimizado());
    }

    public function test_nao_toca_conta_ja_anonimizada_pela_exclusao_de_conta(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $contaExcluida = $this->repo->linha('users', 2);

        $this->assertSame('anonimizado-2@invalid', $contaExcluida['email']);
        $this->assertSame('Usuário anonimizado', $contaExcluida['name']);
        $this->assertSame('hash-antigo-2', $contaExcluida['password']);
    }

    public function test_anonimiza_reservas_e_zera_snapshot_de_conflitos(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $reserva = $this->repo->linha('reservas', 10);

        $this->assertSame('Reserva 10', $reserva['titulo']);
        $this->assertSame(self::TEXTO_NEUTRO, $reserva['descricao']);
        $this->assertSame(self::TEXTO_NEUTRO, $reserva['observacao']);
        $this->assertNull($reserva['conflict_cache']);
    }

    public function test_observacao_nula_da_reserva_permanece_nula(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $this->assertNull($this->repo->linha('reservas', 11)['observacao']);
    }

    public function test_justificativa_de_horario_vira_texto_neutro_e_nula_permanece_nula(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $this->assertSame(self::TEXTO_NEUTRO, $this->repo->linha('horarios', 20)['justificativa']);
        $this->assertNull($this->repo->linha('horarios', 21)['justificativa']);
    }

    public function test_descricao_de_espaco_e_descricao_de_papel_viram_texto_neutro(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $this->assertSame(self::TEXTO_NEUTRO, $this->repo->linha('espacos', 30)['descricao']);
        $this->assertNull($this->repo->linha('roles', 40)['description']);
    }

    public function test_segunda_execucao_nao_altera_nada(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);
        $atualizacoesAposPrimeira = count($this->repo->atualizacoes);

        $relatorio = $this->service->anonimizar('$2y$04$outro-hash', semArquivos: true);

        $this->assertCount($atualizacoesAposPrimeira, $this->repo->atualizacoes);
        $this->assertSame(0, $this->quantidadeDe($relatorio, 'users'));
        $this->assertSame(0, $this->quantidadeDe($relatorio, 'reservas'));
        $this->assertSame(0, $this->quantidadeDe($relatorio, 'horarios'));
        $this->assertSame(self::HASH, $this->repo->linha('users', 1)['password']);
    }

    public function test_apaga_tabelas_de_sessao_cache_e_fila_e_ignora_as_que_nao_existem(): void
    {
        $relatorio = $this->service->anonimizar(self::HASH, semArquivos: true);

        $apagadas = array_column($this->repo->apagamentos, 'tabela');

        $this->assertContains('sessions', $apagadas);
        $this->assertContains('jobs', $apagadas);
        $this->assertContains('cache', $apagadas);
        $this->assertNotContains('telescope_entries', $apagadas);
        $this->assertSame(0, $this->repo->contar('sessions'));
        $this->assertSame(1, $this->quantidadeDe($relatorio, 'sessions', 'apagar'));
    }

    public function test_apagar_em_lote_usa_chave_da_tabela_e_tabela_composta_sem_chave(): void
    {
        $this->service->anonimizar(self::HASH, semArquivos: true);

        $chaves = [];
        foreach ($this->repo->apagamentos as $apagamento) {
            $chaves[$apagamento['tabela']] = $apagamento['chave'];
        }

        $this->assertSame('id', $chaves['jobs']);
        $this->assertSame('key', $chaves['cache']);
        $this->assertNull($chaves['espaco_user']);
    }

    public function test_apaga_fotos_de_perfil_no_disco_publico(): void
    {
        Storage::disk('public')->put('avatars/fulano.jpg', 'conteudo');
        Storage::disk('public')->put('espacos/foto.jpg', 'conteudo');

        $relatorio = $this->service->anonimizar(self::HASH, semArquivos: false);

        $this->assertFalse(Storage::disk('public')->exists('avatars/fulano.jpg'));
        $this->assertTrue(Storage::disk('public')->exists('espacos/foto.jpg'));
        $this->assertSame(1, $relatorio['arquivos']);
    }

    public function test_sem_arquivos_mantem_fotos_de_perfil(): void
    {
        Storage::disk('public')->put('avatars/fulano.jpg', 'conteudo');

        $relatorio = $this->service->anonimizar(self::HASH, semArquivos: true);

        $this->assertTrue(Storage::disk('public')->exists('avatars/fulano.jpg'));
        $this->assertNull($relatorio['arquivos']);
    }

    private function quantidadeDe(array $relatorio, string $tabela, string $operacao = 'anonimizar'): ?int
    {
        foreach ($relatorio['tabelas'] as $item) {
            if ($item['tabela'] === $tabela && $item['operacao'] === $operacao) {
                return $item['quantidade'];
            }
        }

        return null;
    }

    private function semearBase(): void
    {
        $this->repo->tabelas = [
            'users' => [
                1 => [
                    'id' => 1,
                    'name' => 'Fulano de Teste',
                    'email' => 'fulano@exemplo.test',
                    'telefone' => '77 90000-0001',
                    'profile_pic' => 'avatars/fulano.jpg',
                    'password' => 'hash-antigo-1',
                    'remember_token' => 'token-de-lembrar',
                    'two_factor_secret' => 'segredo',
                    'two_factor_recovery_codes' => 'codigos',
                    'two_factor_confirmed_at' => '2026-01-01 00:00:00',
                    'setor_id' => 7,
                    'email_verified_at' => '2026-01-02 00:00:00',
                ],
                2 => [
                    'id' => 2,
                    'name' => 'Usuário anonimizado',
                    'email' => 'anonimizado-2@invalid',
                    'telefone' => '',
                    'profile_pic' => '',
                    'password' => 'hash-antigo-2',
                    'remember_token' => null,
                    'two_factor_secret' => null,
                    'two_factor_recovery_codes' => null,
                    'two_factor_confirmed_at' => null,
                    'setor_id' => null,
                    'email_verified_at' => null,
                ],
            ],
            'reservas' => [
                10 => [
                    'id' => 10,
                    'titulo' => 'Reunião de teste',
                    'descricao' => 'Descrição com nome de terceiro',
                    'observacao' => 'Observação livre',
                    'conflict_cache' => '{"1": {"conflito_user_name": "Outra Pessoa"}}',
                ],
                11 => [
                    'id' => 11,
                    'titulo' => 'Reserva 11',
                    'descricao' => 'Descrição',
                    'observacao' => null,
                    'conflict_cache' => null,
                ],
            ],
            'horarios' => [
                20 => ['id' => 20, 'justificativa' => 'Motivo digitado pelo gestor'],
                21 => ['id' => 21, 'justificativa' => null],
            ],
            'espacos' => [
                30 => ['id' => 30, 'descricao' => 'Sala com texto livre'],
            ],
            'roles' => [
                40 => ['id' => 40, 'description' => null],
            ],
            'sessions' => [
                'sessao-1' => ['id' => 'sessao-1', 'payload' => 'dados'],
            ],
            'jobs' => [
                1 => ['id' => 1, 'payload' => 'dados'],
            ],
            'cache' => [
                'chave' => ['key' => 'chave', 'value' => 'valor'],
            ],
            'espaco_user' => [
                1 => ['user_id' => 1, 'espaco_id' => 30],
            ],
        ];
    }
}

final class RepositorioDeAnonimizacaoEmMemoria implements AnonimizacaoDeBaseRepositoryInterface
{
    /** @var array<string, array<int|string, array<string, mixed>>> */
    public array $tabelas = [];

    /** @var list<array{tabela: string, id: int, atributos: array<string, mixed>}> */
    public array $atualizacoes = [];

    /** @var list<array{tabela: string, chave: ?string}> */
    public array $apagamentos = [];

    public function linhasAposId(string $tabela, array $colunas, int $aposId, int $tamanho): array
    {
        $linhas = [];

        foreach ($this->tabelas[$tabela] ?? [] as $id => $linha) {
            if ((int) $id <= $aposId) {
                continue;
            }

            $linhas[] = array_intersect_key($linha, array_flip($colunas));

            if (count($linhas) === $tamanho) {
                break;
            }
        }

        return $linhas;
    }

    public function atualizar(string $tabela, int $id, array $atributos): int
    {
        $this->atualizacoes[] = ['tabela' => $tabela, 'id' => $id, 'atributos' => $atributos];
        $this->tabelas[$tabela][$id] = array_merge($this->tabelas[$tabela][$id], $atributos);

        return 1;
    }

    public function tabelaExiste(string $tabela): bool
    {
        return array_key_exists($tabela, $this->tabelas);
    }

    public function contar(string $tabela): int
    {
        return count($this->tabelas[$tabela] ?? []);
    }

    public function apagarTudo(string $tabela, ?string $chave, int $tamanho): int
    {
        $this->apagamentos[] = ['tabela' => $tabela, 'chave' => $chave];

        $total = count($this->tabelas[$tabela] ?? []);
        $this->tabelas[$tabela] = [];

        return $total;
    }

    /**
     * @return array<string, mixed>
     */
    public function linha(string $tabela, int|string $id): array
    {
        return $this->tabelas[$tabela][$id];
    }
}
