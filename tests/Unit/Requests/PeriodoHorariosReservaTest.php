<?php

declare(strict_types=1);

namespace Tests\Unit\Requests;

use App\Http\Requests\StoreReservaRequest;
use App\Http\Requests\UpdateReservaRequest;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Validator;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PeriodoHorariosReservaTest extends TestCase
{
    private const APOS_DATA_INICIAL = 'Each time slot date must be on or after the start date.';

    private const ANTES_DA_DATA_FINAL = 'Each time slot date must be on or before the end date.';

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-11-19 10:00:00'));
        app()->setLocale('en');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    #[Test]
    public function store_recusa_horarios_com_data_anterior_a_data_inicial(): void
    {
        $erros = $this->erros(StoreReservaRequest::class, [
            'data_inicial' => '2026-12-01',
            'data_final' => '2026-12-01',
            'horarios_solicitados' => [
                ['data' => '2026-11-24'],
                ['data' => '2026-11-26'],
            ],
        ]);

        $this->assertSame([self::APOS_DATA_INICIAL], $erros['horarios_solicitados.0.data']);
        $this->assertSame([self::APOS_DATA_INICIAL], $erros['horarios_solicitados.1.data']);
    }

    #[Test]
    public function store_recusa_horario_depois_da_data_final(): void
    {
        $erros = $this->erros(StoreReservaRequest::class, [
            'data_inicial' => '2026-11-24',
            'data_final' => '2026-11-30',
            'horarios_solicitados' => [
                ['data' => '2026-12-02'],
            ],
        ]);

        $this->assertSame([self::ANTES_DA_DATA_FINAL], $erros['horarios_solicitados.0.data']);
    }

    #[Test]
    public function store_aceita_horarios_dentro_do_periodo(): void
    {
        $erros = $this->erros(StoreReservaRequest::class, [
            'data_inicial' => '2026-11-24',
            'data_final' => '2026-12-08',
            'horarios_solicitados' => [
                ['data' => '2026-11-24'],
                ['data' => '2026-12-08'],
            ],
        ]);

        $this->assertSame([], $erros);
    }

    #[Test]
    public function update_escopo_single_ignora_o_periodo_pois_o_job_recalcula(): void
    {
        $erros = $this->erros(UpdateReservaRequest::class, [
            'edit_scope' => 'single',
            'edited_week_date' => '2026-12-01',
            'data_inicial' => '2026-12-01',
            'data_final' => '2026-12-01',
            'horarios_solicitados' => [
                ['data' => '2026-11-24'],
            ],
        ]);

        $this->assertSame([], $erros);
    }

    #[Test]
    public function update_escopo_recurring_recusa_horario_fora_do_periodo(): void
    {
        $erros = $this->erros(UpdateReservaRequest::class, [
            'edit_scope' => 'recurring',
            'edited_week_date' => '2026-12-01',
            'data_inicial' => '2026-12-01',
            'data_final' => '2026-12-01',
            'horarios_solicitados' => [
                ['data' => '2026-11-24'],
            ],
        ]);

        $this->assertSame([self::APOS_DATA_INICIAL], $erros['horarios_solicitados.0.data']);
    }

    #[Test]
    public function update_escopo_recurring_aceita_reserva_antiga_com_periodo_coerente(): void
    {
        $erros = $this->erros(UpdateReservaRequest::class, [
            'edit_scope' => 'recurring',
            'data_inicial' => '2026-09-01',
            'data_final' => '2026-09-22',
            'horarios_solicitados' => [
                ['data' => '2026-09-01'],
                ['data' => '2026-09-15'],
            ],
        ]);

        $this->assertSame([], $erros);
    }

    /**
     * @param  class-string<FormRequest>  $requestClass
     * @param  array<string, mixed>  $dados
     * @return array<string, list<string>>
     */
    private function erros(string $requestClass, array $dados): array
    {
        $request = $requestClass::create('/', 'POST', $dados);
        $regras = $request->rules();

        $validador = Validator::make($dados, [
            'data_inicial' => $regras['data_inicial'],
            'data_final' => $regras['data_final'],
            'horarios_solicitados.*.data' => $regras['horarios_solicitados.*.data'],
        ]);

        return $validador->errors()->toArray();
    }
}
