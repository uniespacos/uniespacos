<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixReservaDatasCommand extends Command
{
    protected $signature = 'reservas:fix-datas-periodo
                            {--dry-run : Audita e mostra o que seria corrigido, sem alterar nada}
                            {--force : Executa sem confirmação interativa}';

    protected $description = 'Corrige data_inicial/data_final de reservas afetadas pelo bug #255 (edit_scope=single reescrevia períodos incorretamente).';

    public function handle(): int
    {
        $this->info('Procurando reservas com períodos divergentes...');

        $divergentes = $this->divergentes();
        $total = count($divergentes);

        if ($total === 0) {
            $this->info('Nenhuma reserva com período divergente encontrada. Nada a fazer.');

            return self::SUCCESS;
        }

        $this->warn("Reservas com períodos divergentes encontradas: {$total}");

        if ($this->option('dry-run')) {
            $this->mostrarAmostra($divergentes);
            $this->info('[DRY-RUN] Nenhuma alteração foi feita.');

            return self::SUCCESS;
        }

        if (! $this->option('force') && ! $this->confirm("Corrigir {$total} reservas?")) {
            $this->comment('Operação cancelada.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($divergentes): void {
            foreach (array_chunk($divergentes, 1000) as $lote) {
                foreach ($lote as $row) {
                    DB::table('reservas')
                        ->where('id', $row->reserva_id)
                        ->update([
                            'data_inicial' => $row->min_data,
                            'data_final' => $row->max_data,
                        ]);
                }
            }
        });

        $this->info("{$total} reservas corrigidas.");

        return self::SUCCESS;
    }

    /**
     * @return array<int, \stdClass>
     */
    private function divergentes(): array
    {
        return DB::select('
            SELECT
                stats.reserva_id,
                stats.min_data,
                stats.max_data
            FROM (
                SELECT
                    h.reserva_id,
                    MIN(h.data) as min_data,
                    MAX(h.data) as max_data
                FROM horarios h
                GROUP BY h.reserva_id
            ) stats
            INNER JOIN reservas r ON r.id = stats.reserva_id
            WHERE r.data_inicial != stats.min_data OR r.data_final != stats.max_data
            ORDER BY stats.reserva_id ASC
        ', []);
    }

    /**
     * @param  array<int, \stdClass>  $divergentes
     */
    private function mostrarAmostra(array $divergentes): void
    {
        $amostra = collect($divergentes)
            ->take(10)
            ->map(function ($row) {
                $reserva = DB::table('reservas')
                    ->where('id', $row->reserva_id)
                    ->select('titulo', 'data_inicial', 'data_final')
                    ->first();

                $totalHorarios = DB::table('horarios')
                    ->where('reserva_id', $row->reserva_id)
                    ->count();

                if (! $reserva) {
                    return null;
                }

                $titulo = (string) ($reserva->titulo ?? '');
                $titulo = strlen($titulo) > 30
                    ? substr($titulo, 0, 27).'...'
                    : $titulo;

                return [
                    'ID' => $row->reserva_id,
                    'Título' => $titulo,
                    'data_inicial' => $reserva->data_inicial ?? '',
                    'nova_inicial' => $row->min_data,
                    'data_final' => $reserva->data_final ?? '',
                    'nova_final' => $row->max_data,
                    'Horários' => $totalHorarios,
                ];
            })
            ->filter()
            ->values();

        if ($amostra->isEmpty()) {
            return;
        }

        $this->line('');
        $this->line('Sample (showing first '.count($amostra).'):');
        $this->line('');

        $headers = ['ID', 'Título', 'data_inicial', 'nova_inicial', 'data_final', 'nova_final', 'Horários'];
        $this->table($headers, $amostra->all());
    }
}
