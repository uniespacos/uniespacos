<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Queue\Connectors\SyncConnector;

final class FilaQueFalhaConnector extends SyncConnector
{
    public function connect(array $config)
    {
        $fila = new FilaQueFalhaParaValidacaoDeConflitos($config['after_commit'] ?? null);
        $fila->setContainer(app());

        return $fila;
    }
}
