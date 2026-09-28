<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Horario;
use App\Models\Reserva;
use App\Models\User;
use Tests\TestCase;

/**
 * Issue #112 — standardized error envelope for JSON responses.
 *
 * The envelope is deliberately ADDITIVE: `message` and `errors` stay exactly
 * where Laravel puts them, and `error_code`/`details` are added alongside.
 * Two consumers depend on that:
 *
 *  - resources/js/hooks/use-gerar-relatorio.ts reads `data.message` at the root
 *    on 422; nesting it would silently kill the error toast.
 *  - Inertia's useForm relies on the `errors` bag for every form in the app.
 *
 * The compatibility cases below are as important as the new-field ones — they
 * are what stops this change from breaking what already works.
 */
class ErrorHandlingTest extends TestCase
{
    private function reservaDeOutroUsuario(): Reserva
    {
        $dono = User::factory()->create();
        $espaco = Espaco::factory()->create();
        $agenda = Agenda::factory()->create([
            'espaco_id' => $espaco->id,
            'user_id' => User::factory()->create()->id,
            'turno' => 'manha',
        ]);

        $reserva = Reserva::factory()->create([
            'user_id' => $dono->id,
            'situacao' => 'em_analise',
            'data_inicial' => now()->toDateString(),
            'data_final' => now()->toDateString(),
            'recorrencia' => 'unica',
        ]);

        Horario::factory()->create([
            'reserva_id' => $reserva->id,
            'agenda_id' => $agenda->id,
            'situacao' => 'em_analise',
            'data' => now()->toDateString(),
            'horario_inicio' => '08:00:00',
            'horario_fim' => '10:00:00',
        ]);

        return $reserva->fresh();
    }

    // ---------------------------------------------------------------
    // Novos campos
    // ---------------------------------------------------------------

    public function test_json_forbidden_response_carries_error_code(): void
    {
        $atacante = User::factory()->create();
        $reserva = $this->reservaDeOutroUsuario();

        $response = $this->actingAs($atacante)
            ->getJson(route('reservas.show', $reserva->id));

        $response->assertForbidden();
        $response->assertJsonPath('error_code', 'FORBIDDEN');
        $response->assertJsonStructure(['message', 'error_code', 'details']);
    }

    public function test_json_not_found_response_carries_error_code(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->getJson(route('reservas.show', 999999));

        $response->assertNotFound();
        $response->assertJsonPath('error_code', 'NOT_FOUND');
    }

    public function test_json_validation_response_carries_error_code_and_details(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        // tipo válido (senão o authorize do FormRequest devolve 403 antes da
        // validação); data_fim anterior a data_inicio dispara o 422.
        $response = $this->actingAs($gestor)->postJson(route('gestor.relatorios.dados'), [
            'tipo' => 'reservas_periodo',
            'data_inicio' => '2026-05-10',
            'data_fim' => '2026-05-01',
        ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error_code', 'VALIDATION_FAILED');
        $response->assertJsonPath('details.data_fim.0', fn ($msg) => is_string($msg) && $msg !== '');
    }

    // ---------------------------------------------------------------
    // Compatibilidade — o que não pode quebrar
    // ---------------------------------------------------------------

    /** Guarda de use-gerar-relatorio.ts, que lê data.message na raiz. */
    public function test_validation_response_keeps_message_at_the_root(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $response = $this->actingAs($gestor)->postJson(route('gestor.relatorios.dados'), [
            'tipo' => 'reservas_periodo',
            'data_inicio' => '2026-05-10',
            'data_fim' => '2026-05-01',
        ]);

        $response->assertStatus(422);
        $this->assertIsString($response->json('message'));
        $this->assertNotSame('', $response->json('message'));
    }

    /** Guarda do errors bag, do qual todo formulário Inertia depende. */
    public function test_validation_response_keeps_the_original_errors_bag(): void
    {
        $gestor = User::factory()->create();
        $gestor->assignRole('gestor');

        $response = $this->actingAs($gestor)->postJson(route('gestor.relatorios.dados'), [
            'tipo' => 'reservas_periodo',
            'data_inicio' => '2026-05-10',
            'data_fim' => '2026-05-01',
        ]);

        $response->assertStatus(422);
        $response->assertJsonStructure(['errors' => ['data_fim']]);
    }

    /**
     * Requisição Inertia é AJAX (X-Requested-With), mas pede text/html — então
     * expectsJson() é false e ela não entra no ramo do envelope.
     *
     * O X-Inertia-Version vem da mesma fonte que o middleware usa. Sem ele, o
     * header chega vazio e o Inertia devolve 409 antes do controller sempre que
     * public/build/manifest.json existir, tornando o teste dependente de haver
     * ou não um build local.
     */
    public function test_inertia_request_does_not_receive_the_envelope(): void
    {
        $atacante = User::factory()->create();
        $reserva = $this->reservaDeOutroUsuario();

        $versaoAssets = app(HandleInertiaRequests::class)->version(request()) ?? '';

        $response = $this->actingAs($atacante)
            ->withHeaders([
                'X-Inertia' => 'true',
                'X-Inertia-Version' => $versaoAssets,
                'X-Requested-With' => 'XMLHttpRequest',
                'Accept' => 'text/html, application/xhtml+xml',
            ])
            ->get(route('reservas.show', $reserva->id));

        $response->assertForbidden();
        $this->assertStringNotContainsString('error_code', $response->getContent() ?: '');
    }

    /** Page load direto continua no caminho da #119 (Errors/ErrorPage). */
    public function test_page_request_does_not_receive_the_envelope(): void
    {
        $atacante = User::factory()->create();
        $reserva = $this->reservaDeOutroUsuario();

        $response = $this->actingAs($atacante)->get(route('reservas.show', $reserva->id));

        $response->assertForbidden();
        $this->assertStringNotContainsString('error_code', $response->getContent() ?: '');
    }
}
