<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\Reserva\ValidationStatusEnum;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Remove os horarios duplicados gerados pela expansao indevida de recorrencia.
 *
 * Rodar SOMENTE depois que a correcao dos jobs estiver em producao: enquanto a
 * versao antiga estiver no ar, novas duplicatas voltam a aparecer logo apos a
 * limpeza.
 */
class CleanDuplicateHorariosCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reservas:clean-duplicates
                            {--dry-run : Audita e mostra o que seria removido, sem alterar nada}
                            {--force : Executa sem confirmação interativa}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove horários duplicados gerados pela expansão indevida de recorrência.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Procurando horários duplicados...');

        $duplicados = $this->duplicados();
        $total = count($duplicados);

        if ($total === 0) {
            $this->info('Nenhum horário duplicado encontrado. Nada a fazer.');

            return self::SUCCESS;
        }

        $reservasAfetadas = collect($duplicados)
            ->map(fn (\stdClass $linha) => (int) $linha->reserva_id)
            ->unique()
            ->values();

        $this->warn("Registros duplicados encontrados: {$total}");
        $this->line("Reservas afetadas: {$reservasAfetadas->count()}");

        if ($this->option('dry-run')) {
            $this->mostrarAmostra($reservasAfetadas);
            $this->info('[DRY-RUN] Nenhuma alteração foi feita.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("Deletar {$total} registros duplicados?")) {
            $this->comment('Operação cancelada.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($duplicados, $reservasAfetadas): void {
            foreach (array_chunk(array_column($duplicados, 'id'), 1000) as $lote) {
                DB::table('horarios')->whereIn('id', $lote)->delete();
            }

            // O `conflict_cache` e um JSON chaveado por id de horario: depois da
            // limpeza esses ids apontam para linhas que nao existem mais, e a
            // tela mostraria conflito fantasma. Zerar e marcar como pendente faz
            // o `reservas:fix-validations` reprocessar.
            DB::table('reservas')
                ->whereIn('id', $reservasAfetadas->all())
                ->update(['validation_status' => ValidationStatusEnum::PENDING->value, 'conflict_cache' => null]);
        });

        $this->info("{$total} registros duplicados removidos.");
        $this->comment('Agora rode `php artisan reservas:fix-validations` para reprocessar os conflitos.');

        return self::SUCCESS;
    }

    /**
     * Excedentes de cada grupo, preservando a ocorrência mais antiga (menor id).
     *
     * O particionamento usa exatamente as colunas do índice único que será
     * criado depois: se aqui fosse mais específico, sobrariam linhas que o
     * índice recusaria e a migração falharia.
     *
     * @return array<int, \stdClass>
     */
    private function duplicados(): array
    {
        return DB::select('
            SELECT id, reserva_id FROM (
                SELECT id, reserva_id, ROW_NUMBER() OVER (
                    PARTITION BY reserva_id, agenda_id, data, horario_inicio
                    ORDER BY id ASC
                ) AS row_num
                FROM horarios
            ) t
            WHERE t.row_num > 1
        ');
    }

    /**
     * @param  Collection<int, int>  $reservasAfetadas
     */
    private function mostrarAmostra(Collection $reservasAfetadas): void
    {
        $amostra = DB::table('reservas')
            ->whereIn('id', $reservasAfetadas->take(10)->all())
            ->select('id', 'titulo', 'recorrencia')
            ->get();

        if ($amostra->isEmpty()) {
            return;
        }

        $this->table(
            ['Reserva', 'Título', 'Recorrência'],
            $amostra->map(fn ($r) => [$r->id, $r->titulo, $r->recorrencia])->all()
        );
    }
}
