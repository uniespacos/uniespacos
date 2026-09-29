<?php

declare(strict_types=1);

use App\Models\Espaco;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// OPÇÃO A (Recomendada): Alinhar à autorização real da rota espacos.show.
// Qualquer autenticado pode ver a página e seus metadados em tempo real.
Broadcast::channel('App.Models.Espaco.{id}', function ($user, $id) {
    return Espaco::query()->whereKey($id)->exists();
});

// OPÇÃO B (Alternativa): Manter autorização estrita por permissão.
// Requer concessão de 'espacos.visualizar' a 'gestor' e 'comum' em migration de seeder.
// Descomente abaixo se opção B for escolhida e recomente Opção A acima.
/*
Broadcast::channel('App.Models.Espaco.{id}', function ($user, $id) {
    return $user->can('view', Espaco::findOrFail($id));
});
*/
