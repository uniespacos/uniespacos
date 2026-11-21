<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\EspacoFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Auth;

class Espaco extends Model
{
    /** @use HasFactory<EspacoFactory> */
    use HasFactory;

    protected $fillable = [
        'nome',
        'capacidade_pessoas',
        'descricao',
        'imagens',
        'main_image_index',
        'andar_id',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'imagens' => 'array',
        ];
    }

    /**
     * @var list<string>
     */
    protected $appends = ['is_favorited_by_user'];

    /**
     * @return HasMany<Agenda, $this>
     */
    public function agendas(): HasMany
    {
        return $this->hasMany(Agenda::class);
    }

    /**
     * @return BelongsTo<Andar, $this>
     */
    public function andar(): BelongsTo
    {
        return $this->belongsTo(Andar::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function favoritadoPor(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'espaco_user', 'espaco_id', 'user_id');
    }

    /**
     * IDs dos espaços favoritados, memorizados por usuário durante o request.
     *
     * @var array<int, array<int, true>>
     */
    protected static array $favoritosPorUsuario = [];

    /**
     * Descarta o cache de favoritos (após favoritar/desfavoritar).
     */
    public static function forgetFavoritosCache(?int $userId = null): void
    {
        if ($userId === null) {
            static::$favoritosPorUsuario = [];

            return;
        }

        unset(static::$favoritosPorUsuario[$userId]);
    }

    /**
     * @return Attribute<bool, never>
     */
    protected function isFavoritedByUser(): Attribute
    {
        return Attribute::make(
            get: function (): bool {
                $user = Auth::user();

                if (! $user) {
                    return false;
                }

                // Está em $appends: é calculado para cada espaço serializado. Os favoritos
                // são carregados uma vez por usuário, sem um EXISTS por espaço.
                static::$favoritosPorUsuario[$user->id] ??= array_fill_keys(
                    $user->favoritos()->pluck('espacos.id')->all(),
                    true
                );

                return isset(static::$favoritosPorUsuario[$user->id][$this->id]);
            },
        );
    }
}
