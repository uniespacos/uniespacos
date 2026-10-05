<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property bool $is_conflicted Set dynamically in ReservaService to flag conflict state.
 * @property string|null $conflict_details Set dynamically in ReservaService with conflict description.
 */
class Horario extends Model
{
    use HasFactory;

    protected $fillable = [
        'agenda_id',
        'reserva_id',
        'horario_inicio',
        'horario_fim',
        'data',
        'situacao',
        'justificativa',
        'user_id',
    ];

    /**
     * @return BelongsTo<Reserva, $this>
     */
    public function reserva(): BelongsTo
    {
        return $this->belongsTo(Reserva::class);
    }

    /**
     * @return BelongsTo<Agenda, $this>
     */
    public function agenda(): BelongsTo
    {
        return $this->belongsTo(Agenda::class);
    }

    /**
     * The user who evaluated this horario (stored as user_id).
     *
     * @return BelongsTo<User, $this>
     */
    public function avaliador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
