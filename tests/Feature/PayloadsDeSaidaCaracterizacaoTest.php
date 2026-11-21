<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Andar;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Instituicao;
use App\Models\Modulo;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\Unidade;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PayloadsDeSaidaCaracterizacaoTest extends TestCase
{
    private const SEMANA = '2026-06-01';

    private const PAGINADOR = [
        'current_page' => 'int',
        'data' => 'list',
        'first_page_url' => 'string',
        'from' => 'null|int',
        'last_page' => 'int',
        'last_page_url' => 'string',
        'links' => 'list',
        'next_page_url' => 'null|string',
        'path' => 'string',
        'per_page' => 'int',
        'prev_page_url' => 'null|string',
        'to' => 'null|int',
        'total' => 'int',
    ];

    private const USUARIO_LISTAGEM_INDEX = [
        'id' => 'int',
        'name' => 'string',
        'email' => 'string',
        'telefone' => 'null|string',
        'email_verified_at' => 'null|string',
        'setor_id' => 'null|int',
        'roles' => 'list',
        'anonimizado' => 'bool',
    ];

    private const AUTH_USER = [
        'id' => 'int',
        'name' => 'string',
        'email' => 'string',
        'email_verified_at' => 'null|string',
        'telefone' => 'null|string',
        'profile_pic' => 'null|string',
        'setor_id' => 'null|int',
        'created_at' => 'string',
        'updated_at' => 'string',
        'setor' => [
            'id' => 'int',
            'nome' => 'string',
            'sigla' => 'string',
            'unidade_id' => 'int',
            'created_at' => 'string',
            'updated_at' => 'string',
            'unidade' => 'array',
        ],
        'roles' => 'list',
        'permissions' => 'list',
        'direct_permissions' => 'list',
        'unread_notifications_count' => 'int',
    ];

    private const INSTITUICAO = [
        'id' => 'int',
        'nome' => 'string',
        'sigla' => 'string',
        'endereco' => 'null|string',
        'created_at' => 'string',
        'updated_at' => 'string',
        'unidades' => ['*' => [
            'id' => 'int',
            'nome' => 'string',
            'sigla' => 'null|string',
            'instituicao_id' => 'int',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]],
    ];

    private const USUARIO_MODAL = [
        'id' => 'int',
        'name' => 'string',
        'email' => 'string',
        'email_verified_at' => 'null|string',
        'telefone' => 'null|string',
        'profile_pic' => 'null|string',
        'setor_id' => 'null|int',
        'created_at' => 'string',
        'updated_at' => 'string',
        'two_factor_confirmed_at' => 'null',
    ];

    private const RESERVA_BASE = [
        'id' => 'int',
        'titulo' => 'null|string',
        'descricao' => 'null|string',
        'situacao' => 'string',
        'data_inicial' => 'string',
        'data_final' => 'string',
        'recorrencia' => 'string',
        'observacao' => 'null|string',
        'user_id' => 'int',
        'created_at' => 'string',
        'updated_at' => 'string',
        'validation_status' => 'null|string',
        'conflict_cache' => 'null|array',
        'publico_estimado' => 'null|int',
        'categoria' => 'null|string',
    ];

    private const AGENDA_USER_LISTAGEM = [
        'id' => 'int',
        'name' => 'string',
    ];

    private const AGENDA_USER_MODAL = [
        'id' => 'int',
        'name' => 'string',
        'email' => 'string',
        'setor_id' => 'null|int',
    ];

    private const ESPACO = [
        'id' => 'int',
        'nome' => 'string',
        'capacidade_pessoas' => 'int',
        'descricao' => 'null|string',
        'imagens' => 'null',
        'main_image_index' => 'null',
        'andar_id' => 'int',
        'created_at' => 'string',
        'updated_at' => 'string',
        'is_favorited_by_user' => 'bool',
        'andar' => 'array',
    ];

    private const AGENDA = [
        'id' => 'int',
        'turno' => 'string',
        'espaco_id' => 'int',
        'user_id' => 'int',
        'created_at' => 'string',
        'updated_at' => 'string',
        'espaco' => self::ESPACO,
    ];

    private const HORARIO = [
        'id' => 'int',
        'agenda_id' => 'int',
        'reserva_id' => 'int',
        'horario_inicio' => 'string',
        'horario_fim' => 'string',
        'data' => 'string',
        'situacao' => 'string',
        'justificativa' => 'null|string',
        'user_id' => 'null|int',
        'created_at' => 'string',
        'updated_at' => 'string',
    ];

    private const USUARIO_REFERENCIA = [
        'id' => 'int',
        'name' => 'string',
    ];

    /**
     * @param  array<string, string>  $agendaUser
     * @param  array<string, string>  $usuario
     * @return array<string, mixed>
     */
    private function relacoes(array $agendaUser, array $usuario, bool $comAvaliador): array
    {
        $horario = self::HORARIO + ['agenda' => self::AGENDA + ['user' => $agendaUser]];
        if ($comAvaliador) {
            $horario['avaliador'] = 'null';
        }

        return ['horarios' => ['*' => $horario], 'user' => $usuario];
    }

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse(self::SEMANA.' 10:00:00'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function assertTipo(string $tipos, mixed $valor, string $caminho): void
    {
        foreach (explode('|', $tipos) as $tipo) {
            $confere = match ($tipo) {
                'int' => is_int($valor),
                'string' => is_string($valor),
                'bool' => is_bool($valor),
                'null' => $valor === null,
                'array' => is_array($valor),
                'list' => is_array($valor) && array_is_list($valor),
                default => false,
            };

            if ($confere) {
                return;
            }
        }

        $this->fail("Tipo divergente em {$caminho}: esperado {$tipos}, obtido ".get_debug_type($valor));
    }

    private function assertEstrutura(array $esperada, array $obtido, string $caminho): void
    {
        $chavesEsperadas = array_keys($esperada);
        $chavesObtidas = array_keys($obtido);
        sort($chavesEsperadas);
        sort($chavesObtidas);

        $this->assertSame($chavesEsperadas, $chavesObtidas, "Conjunto de chaves divergente em {$caminho}");

        foreach ($esperada as $chave => $spec) {
            $valor = $obtido[$chave];
            $caminhoChave = "{$caminho}.{$chave}";

            if (is_array($spec) && array_key_exists('*', $spec)) {
                $this->assertTipo('list', $valor, $caminhoChave);
                foreach ($valor as $indice => $item) {
                    $this->assertEstrutura($spec['*'], $item, "{$caminhoChave}[{$indice}]");
                }

                continue;
            }

            if (is_array($spec)) {
                $this->assertTipo('array', $valor, $caminhoChave);
                $this->assertEstrutura($spec, $valor, $caminhoChave);

                continue;
            }

            $this->assertTipo($spec, $valor, $caminhoChave);
        }
    }

    private function props(TestResponse $response): array
    {
        return json_decode((string) json_encode($response->viewData('page')['props']), true, 512, JSON_THROW_ON_ERROR);
    }

    private function unidadeComSetor(): Setor
    {
        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);

        return Setor::factory()->create(['unidade_id' => $unidade->id]);
    }

    private function admin(Setor $setor): User
    {
        $admin = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);
        $admin->assignRole('institucional');

        return $admin;
    }

    /**
     * @return array{Espaco, Agenda}
     */
    private function espacoComAgenda(User $gestor, Setor $setor): array
    {
        $modulo = Modulo::factory()->create(['unidade_id' => $setor->unidade_id]);
        $andar = Andar::factory()->create(['modulo_id' => $modulo->id]);
        $espaco = Espaco::create([
            'andar_id' => $andar->id,
            'nome' => 'Sala de Caracterização',
            'descricao' => 'Descrição',
            'capacidade_pessoas' => 20,
        ]);
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => $gestor->id,
            'turno' => 'manha',
        ]);

        return [$espaco, $agenda];
    }

    /**
     * @return array{Reserva, User}
     */
    private function reservaComHorarioDoGestor(Setor $setor): array
    {
        $gestor = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);
        $gestor->assignRole('gestor');
        $solicitante = User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);

        [, $agenda] = $this->espacoComAgenda($gestor, $setor);

        $reserva = Reserva::factory()->create([
            'user_id' => $solicitante->id,
            'situacao' => 'em_analise',
            'data_inicial' => self::SEMANA,
            'data_final' => self::SEMANA,
            'recorrencia' => 'unica',
            'titulo' => 'Reserva de Caracterização',
        ]);
        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => self::SEMANA,
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return [$reserva, $gestor];
    }

    #[Test]
    public function usuarios_index_expoe_conjunto_exato_de_chaves_e_tipos(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);
        User::factory()->create(['setor_id' => $setor->id, 'email_verified_at' => now()]);

        $props = $this->props($this->actingAs($admin)->get(route('institucional.usuarios.index')));

        foreach (['users', 'setores', 'filters'] as $chave) {
            $this->assertArrayHasKey($chave, $props);
        }

        $this->assertEstrutura(self::PAGINADOR, $props['users'], 'users');
        $this->assertCount(2, $props['users']['data']);
        foreach ($props['users']['data'] as $indice => $usuario) {
            $this->assertEstrutura(self::USUARIO_LISTAGEM_INDEX, $usuario, "users.data[{$indice}]");
        }

        $this->assertEstrutura(['id' => 'int', 'sigla' => 'string'], $props['setores'][0], 'setores[0]');
        $this->assertEstrutura([
            'search' => 'null|string',
            'setor_id' => 'null|int',
            'anonimizados' => 'bool',
        ], $props['filters'], 'filters');
    }

    #[Test]
    public function auth_user_compartilhado_expoe_conjunto_exato_de_chaves_e_tipos(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);

        $props = $this->props($this->actingAs($admin)->get(route('institucional.usuarios.index')));

        $this->assertEstrutura(self::AUTH_USER, $props['auth']['user'], 'auth.user');
        $this->assertSame($admin->id, $props['auth']['user']['id']);
    }

    #[Test]
    public function setores_index_expoe_instituicao_com_conjunto_exato_de_chaves(): void
    {
        $setor = $this->unidadeComSetor();
        $admin = $this->admin($setor);

        $props = $this->props($this->actingAs($admin)->get(route('institucional.setors.index')));

        $this->assertEstrutura(self::INSTITUICAO, $props['instituicao'], 'instituicao');
    }

    #[Test]
    public function reservas_index_expoe_listagem_e_modal_com_conjunto_exato_de_chaves(): void
    {
        $setor = $this->unidadeComSetor();
        [$reserva, $gestor] = $this->reservaComHorarioDoGestor($setor);
        $solicitante = $reserva->user;

        $response = $this->actingAs($solicitante)
            ->get(route('reservas.index', ['reserva' => $reserva->id, 'semana' => self::SEMANA]));
        $props = $this->props($response);

        $this->assertEstrutura(self::PAGINADOR, $props['reservas'], 'reservas');
        $this->assertCount(1, $props['reservas']['data']);
        $this->assertEstrutura(
            [...self::RESERVA_BASE, 'can_update' => 'bool', ...$this->relacoes(self::AGENDA_USER_LISTAGEM, self::USUARIO_REFERENCIA, true)],
            $props['reservas']['data'][0],
            'reservas.data[0]',
        );

        $this->assertEstrutura(
            [...self::RESERVA_BASE, 'can_update' => 'bool', ...$this->relacoes(self::AGENDA_USER_MODAL, self::USUARIO_MODAL, true)],
            $props['reservaToShow'],
            'reservaToShow',
        );
        $this->assertFalse(array_key_exists('possui_horario_avaliado', $props['reservas']['data'][0]));
        $this->assertFalse(array_key_exists('termo_aceito_em', $props['reservas']['data'][0]));

        $this->assertEstrutura([
            'inicio' => 'string',
            'fim' => 'string',
            'referencia' => 'string',
        ], $props['semana'], 'semana');
        $this->assertSame($gestor->id, $props['reservaToShow']['horarios'][0]['agenda']['user']['id']);
    }

    #[Test]
    public function gestor_reservas_index_expoe_listagem_e_modal_sem_can_update(): void
    {
        $setor = $this->unidadeComSetor();
        [$reserva, $gestor] = $this->reservaComHorarioDoGestor($setor);

        $props = $this->props($this->actingAs($gestor)->get(route('gestor.reservas.index', [
            'reserva' => $reserva->id,
            'semana' => self::SEMANA,
        ])));

        $horarioGestor = self::HORARIO + ['agenda' => [
            'id' => 'int',
            'turno' => 'string',
            'espaco_id' => 'int',
            'espaco' => [
                'id' => 'int',
                'nome' => 'string',
                'andar_id' => 'int',
                'is_favorited_by_user' => 'bool',
                'andar' => 'array',
            ],
        ]];
        $relacoesGestor = ['horarios' => ['*' => $horarioGestor], 'user' => self::USUARIO_REFERENCIA];
        $horarioGestorModal = array_merge($horarioGestor, [
            'avaliador' => 'null',
            'agenda' => array_merge($horarioGestor['agenda'], [
                'user_id' => 'int',
                'user' => self::AGENDA_USER_LISTAGEM,
                'espaco' => self::ESPACO,
            ]),
        ]);

        $this->assertEstrutura(self::PAGINADOR, $props['reservas'], 'reservas');
        $this->assertCount(1, $props['reservas']['data']);
        $this->assertEstrutura([...self::RESERVA_BASE, ...$relacoesGestor], $props['reservas']['data'][0], 'reservas.data[0]');
        $this->assertEstrutura(
            [...self::RESERVA_BASE, 'horarios' => ['*' => $horarioGestorModal], 'user' => self::USUARIO_MODAL],
            $props['reservaToShow'],
            'reservaToShow',
        );
        $this->assertFalse(array_key_exists('can_update', $props['reservaToShow']));
    }
}
