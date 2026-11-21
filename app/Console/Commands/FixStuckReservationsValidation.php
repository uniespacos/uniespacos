<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\Reserva\ValidationStatusEnum;
use App\Jobs\ValidateReservationConflictsJob;
use App\Models\Reserva;
use Illuminate\Console\Command;

class FixStuckReservationsValidation extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reservas:fix-validations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Encontra reservas com validação pendente e despacha os jobs de validação de conflitos.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Iniciando a busca por reservas com validação pendente...');

        $reservasParaValidar = Reserva::where('validation_status', ValidationStatusEnum::PENDING->value)->get();

        if ($reservasParaValidar->isEmpty()) {
            $this->info('Nenhuma reserva com validação pendente foi encontrada. Tudo certo!');

            return self::SUCCESS;
        }

        $count = $reservasParaValidar->count();
        $this->info("Encontradas {$count} reservas para revalidar.");

        $bar = $this->output->createProgressBar($count);
        $bar->start();

        foreach ($reservasParaValidar as $reserva) {
            ValidateReservationConflictsJob::dispatch($reserva);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Todos os jobs de validação para as reservas antigas foram despachados para a fila!');
        $this->warn('Certifique-se de que seu queue worker está rodando para processá-los (`php artisan queue:work`).');

        return self::SUCCESS;
    }
}
