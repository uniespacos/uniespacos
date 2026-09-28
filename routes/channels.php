<?php

declare(strict_types=1);

use App\Models\Espaco;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('App.Models.Espaco.{id}', function ($user, $id) {
    return $user->can('view', Espaco::findOrFail($id));
});
