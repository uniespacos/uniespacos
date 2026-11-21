<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\AndarFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Andar extends Model
{
    /** @use HasFactory<AndarFactory> */
    use HasFactory;

    protected $fillable = [
        'nome',
        'tipo_acesso',
        'modulo_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tipo_acesso' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Modulo, $this>
     */
    public function modulo(): BelongsTo
    {
        return $this->belongsTo(Modulo::class);
    }

    /**
     * @return HasMany<Espaco, $this>
     */
    public function espacos(): HasMany
    {
        return $this->hasMany(Espaco::class);
    }
}
