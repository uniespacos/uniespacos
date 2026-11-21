<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Jobs\ValidateReservationConflictsJob;
use Illuminate\Queue\SyncQueue;
use RuntimeException;

final class FilaQueFalhaParaValidacaoDeConflitos extends SyncQueue
{
    public function push($job, $data = '', $queue = null)
    {
        if ($job instanceof ValidateReservationConflictsJob) {
            throw new RuntimeException('Fila indisponivel para validacao de conflitos');
        }

        return parent::push($job, $data, $queue);
    }
}
