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
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class EspacoDisponibilidadeListagemTest extends TestCase
{
    private const DATA = '2026-11-23';

    private const HOJE = '2026-11-19';

    private User $usuario;

    private User $gestor;

    private Andar $andar;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-19 10:00:00', 'America/Bahia'));

        $instituicao = Instituicao::factory()->create();
        $unidade = Unidade::factory()->create(['instituicao_id' => $instituicao->id]);
        $setor = Setor::factory()->create(['unidade_id' => $unidade->id]);

        $this->usuario = User::factory()->create(['setor_id' => $setor->id]);
        $this->usuario->assignRole('comum');

        $modulo = Modulo::factory()->create(['unidade_id' => $unidade->id]);
        $this->andar = Andar::factory()->create(['modulo_id' => $modulo->id]);

        $this->gestor = User::factory()->create();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_espaco_totalmente_ocupado_no_turno_nao_aparece_na_busca_por_data(): void
    {
        $lotado = $this->espacoComAgenda('manha');
        foreach ($this->inicios('manha') as $inicio) {
            $this->ocupar($lotado['agenda'], self::DATA, $inicio);
        }
        $livre = $this->espacoComAgenda('manha');

        $ids = $this->idsDaListagem($this->buscar(['data' => self::DATA, 'turno' => 'manha']));

        $this->assertNotContains($lotado['espaco']->id, $ids);
        $this->assertContains($livre['espaco']->id, $ids);
    }

    public function test_espaco_parcialmente_ocupado_informa_quantidade_de_slots_livres(): void
    {
        $parcial = $this->espacoComAgenda('manha');
        $this->ocupar($parcial['agenda'], self::DATA, '07:30');
        $this->ocupar($parcial['agenda'], self::DATA, '09:10');

        $response = $this->buscar(['data' => self::DATA, 'turno' => 'manha']);

        $this->assertSame(4, $this->horariosLivresDe($response, $parcial['espaco']));
    }

    public function test_horario_em_analise_nao_ocupa_o_slot(): void
    {
        $espaco = $this->espacoComAgenda('manha');
        $this->ocupar($espaco['agenda'], self::DATA, '07:30', 'em_analise');

        $response = $this->buscar(['data' => self::DATA, 'turno' => 'manha']);

        $this->assertSame(6, $this->horariosLivresDe($response, $espaco['espaco']));
    }

    public function test_turno_sem_gestor_nao_conta_como_disponivel(): void
    {
        $semGestor = $this->espacoComAgenda('manha', comGestor: false);

        $ids = $this->idsDaListagem($this->buscar(['data' => self::DATA, 'turno' => 'manha']));

        $this->assertNotContains($semGestor['espaco']->id, $ids);
    }

    public function test_busca_sem_turno_soma_os_slots_de_todos_os_turnos(): void
    {
        $espaco = $this->espacoComAgenda('manha');
        $this->adicionarAgenda($espaco['espaco'], 'tarde');
        $this->ocupar($espaco['agenda'], self::DATA, '07:30');
        $this->ocupar($this->agendaDoTurno($espaco['espaco'], 'tarde'), self::DATA, '13:10');

        $response = $this->buscar(['data' => self::DATA]);

        $this->assertSame(10, $this->horariosLivresDe($response, $espaco['espaco']));
    }

    public function test_hoje_desconta_slots_que_ja_comecaram(): void
    {
        $espaco = $this->espacoComAgenda('manha');

        $response = $this->buscar(['data' => self::HOJE, 'turno' => 'manha']);

        $this->assertSame(3, $this->horariosLivresDe($response, $espaco['espaco']));
    }

    public function test_data_no_passado_e_rejeitada(): void
    {
        $response = $this->buscar(['data' => '2026-11-18']);

        $response->assertSessionHasErrors('data');
    }

    public function test_turno_fora_da_lista_e_rejeitado(): void
    {
        $response = $this->buscar(['data' => self::DATA, 'turno' => 'madrugada']);

        $response->assertSessionHasErrors('turno');
    }

    public function test_sem_data_a_listagem_nao_filtra_e_nao_anexa_horarios_livres(): void
    {
        $lotado = $this->espacoComAgenda('manha');
        foreach ($this->inicios('manha') as $inicio) {
            $this->ocupar($lotado['agenda'], self::DATA, $inicio);
        }

        $response = $this->buscar([]);

        $this->assertArrayNotHasKey('horarios_livres', $this->espacoDaListagem($response, $lotado['espaco']));
    }

    public function test_turno_sem_data_e_ignorado(): void
    {
        $lotado = $this->espacoComAgenda('manha');
        foreach ($this->inicios('manha') as $inicio) {
            $this->ocupar($lotado['agenda'], self::DATA, $inicio);
        }

        $response = $this->buscar(['turno' => 'manha']);

        $this->assertArrayNotHasKey('horarios_livres', $this->espacoDaListagem($response, $lotado['espaco']));
    }

    public function test_filtros_de_data_e_turno_voltam_para_a_pagina(): void
    {
        $response = $this->buscar(['data' => self::DATA, 'turno' => 'tarde']);

        $response->assertOk();
        $filters = $response->viewData('page')['props']['filters'];
        $this->assertSame(self::DATA, $filters['data']);
        $this->assertSame('tarde', $filters['turno']);
    }

    public function test_listagem_com_data_nao_cresce_em_consultas_com_o_numero_de_espacos(): void
    {
        $this->espacoComAgenda('manha');
        $this->contarConsultasDaBusca();
        $consultasComUmEspaco = $this->contarConsultasDaBusca();

        for ($i = 0; $i < 4; $i++) {
            $this->espacoComAgenda('manha');
        }
        $consultasComCincoEspacos = $this->contarConsultasDaBusca();

        $this->assertSame($consultasComUmEspaco, $consultasComCincoEspacos);
    }

    public function test_grade_por_turno_bate_com_slots_por_turno_do_relatorio(): void
    {
        foreach (['manha', 'tarde', 'noite'] as $turno) {
            $this->assertCount(
                (int) config("relatorios.slots_por_turno.{$turno}"),
                (array) config("reservas.horarios_por_turno.{$turno}"),
                "Grade do turno {$turno} diverge de relatorios.slots_por_turno.",
            );
        }
    }

    /**
     * @return array{espaco: Espaco, agenda: Agenda}
     */
    private function espacoComAgenda(string $turno, bool $comGestor = true): array
    {
        $espaco = Espaco::factory()->create(['andar_id' => $this->andar->id]);
        Agenda::where('espaco_id', $espaco->id)->delete();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'turno' => $turno,
            'user_id' => $comGestor ? $this->gestor->id : null,
        ]);

        return ['espaco' => $espaco, 'agenda' => $agenda];
    }

    private function adicionarAgenda(Espaco $espaco, string $turno): void
    {
        Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'turno' => $turno,
            'user_id' => $this->gestor->id,
        ]);
    }

    private function agendaDoTurno(Espaco $espaco, string $turno): Agenda
    {
        return Agenda::where('espaco_id', $espaco->id)->where('turno', $turno)->firstOrFail();
    }

    private function ocupar(Agenda $agenda, string $data, string $inicio, string $situacao = 'deferida'): void
    {
        $reserva = Reserva::factory()->create(['user_id' => $this->usuario->id]);

        Horario::create([
            'agenda_id' => $agenda->id,
            'reserva_id' => $reserva->id,
            'data' => $data,
            'horario_inicio' => $inicio.':00',
            'horario_fim' => Carbon::createFromFormat('H:i', $inicio)->addMinutes(50)->format('H:i:s'),
            'situacao' => $situacao,
        ]);
    }

    /**
     * @return list<string>
     */
    private function inicios(string $turno): array
    {
        return array_map(
            fn (string $faixa): string => trim(explode('-', $faixa)[0]),
            (array) config("reservas.horarios_por_turno.{$turno}"),
        );
    }

    /**
     * @param  array<string, mixed>  $query
     */
    private function buscar(array $query): TestResponse
    {
        return $this->actingAs($this->usuario)->get(route('espacos.index', $query));
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listagem(TestResponse $response): array
    {
        $response->assertOk();

        /** @var list<array<string, mixed>> $itens */
        $itens = $response->viewData('page')['props']['espacos']['data'];

        return $itens;
    }

    /**
     * @return list<int>
     */
    private function idsDaListagem(TestResponse $response): array
    {
        return array_map(fn (array $espaco): int => (int) $espaco['id'], $this->listagem($response));
    }

    /**
     * @return array<string, mixed>
     */
    private function espacoDaListagem(TestResponse $response, Espaco $espaco): array
    {
        foreach ($this->listagem($response) as $item) {
            if ((int) $item['id'] === $espaco->id) {
                return $item;
            }
        }

        $this->fail('Espaco ausente da listagem.');
    }

    private function horariosLivresDe(TestResponse $response, Espaco $espaco): int
    {
        $item = $this->espacoDaListagem($response, $espaco);
        $this->assertArrayHasKey('horarios_livres', $item);

        return (int) $item['horarios_livres'];
    }

    private function contarConsultasDaBusca(): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        $this->buscar(['data' => self::DATA, 'turno' => 'manha'])->assertOk();

        $total = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $total;
    }
}
