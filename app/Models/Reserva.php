<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SituacaoReserva\ModoArquivoEnum;
use App\Enums\SituacaoReserva\OrdenacaoReservaEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use Carbon\Carbon;
use Database\Factories\ReservaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property bool $can_update Set dynamically in ReservaService based on policy check.
 * @property string|null $existing_justification Set dynamically in ReservaService with first non-null justificativa.
 * @property int|null $publico_estimado
 * @property string|null $categoria
 * @property Carbon|null $termo_aceito_em
 */
class Reserva extends Model
{
    /** @use HasFactory<ReservaFactory> */
    use HasFactory;

    protected $fillable = [
        'titulo',
        'descricao',
        'situacao',
        'data_inicial',
        'data_final',
        'recorrencia',
        'observacao',
        'user_id',
        'validation_status',
        'conflict_cache',
        'publico_estimado',
        'categoria',
        'termo_aceito_em',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'termo_aceito_em',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'conflict_cache' => 'array',
            'publico_estimado' => 'integer',
            'termo_aceito_em' => 'datetime',
        ];
    }

    /**
     * Definido no model para que os repositórios não reescrevam a regra de
     * arquivamento de formas divergentes.
     *
     * @param  Builder<Reserva>  $query
     * @return Builder<Reserva>
     */
    public function scopeArquivo(Builder $query, mixed $modo): Builder
    {
        return match (ModoArquivoEnum::fromFiltro($modo)) {
            ModoArquivoEnum::ARQUIVADAS => $query->where('situacao', SituacaoReservaEnum::INATIVA->value),
            ModoArquivoEnum::TODAS => $query,
            ModoArquivoEnum::ATIVAS => $query->where('situacao', '!=', SituacaoReservaEnum::INATIVA->value),
        };
    }

    /**
     * A prioridade por situação segue a ordem de tratamento da reserva, não a
     * ordem das cases do enum. `latest()` desempata dentro do mesmo grupo.
     *
     * @param  Builder<Reserva>  $query
     * @return Builder<Reserva>
     */
    public function scopeOrdenar(Builder $query, mixed $criterio): Builder
    {
        return match (OrdenacaoReservaEnum::fromFiltro($criterio)) {
            OrdenacaoReservaEnum::SITUACAO => $query->orderByRaw(self::expressaoOrdemDaSituacao())->latest(),
            OrdenacaoReservaEnum::DATA_SOLICITACAO => $query->latest(),
        };
    }

    private static function expressaoOrdemDaSituacao(): string
    {
        $ordem = [
            SituacaoReservaEnum::EM_ANALISE,
            SituacaoReservaEnum::PARCIALMENTE_DEFERIDA,
            SituacaoReservaEnum::INDEFERIDA,
            SituacaoReservaEnum::DEFERIDA,
            SituacaoReservaEnum::INATIVA,
        ];

        $quando = '';
        foreach ($ordem as $posicao => $situacao) {
            $quando .= sprintf(" WHEN '%s' THEN %d", $situacao->value, $posicao + 1);
        }

        return 'CASE situacao'.$quando.' ELSE '.(count($ordem) + 1).' END';
    }

    /**
     * @return Attribute<string, never>
     */
    protected function situacaoFormatada(): Attribute
    {
        return Attribute::make(
            get: fn (): string => SituacaoReservaEnum::labelDe($this->situacao),
        );
    }

    /**
     * @return Attribute<array<int, object>, never>
     */
    protected function resumoHorarios(): Attribute
    {
        return Attribute::make(
            get: function (): array {
                $horarios = $this->horarios()->with('agenda.espaco')->get();

                if ($horarios->count() <= 10) {
                    return $horarios->map(fn ($h) => (object) [
                        'is_summary' => false,
                        'texto' => Carbon::parse($h->data)->format('d/m/Y').
                                   ' das '.Carbon::parse($h->horario_inicio)->format('H:i').
                                   ' às '.Carbon::parse($h->horario_fim)->format('H:i').
                                   ' (Turno: '.$h->agenda->turno.')',
                    ])->toArray();
                }

                $grouped = $horarios->groupBy(function ($h) {
                    return $h->agenda_id.'-'.$h->horario_inicio.'-'.$h->horario_fim;
                });

                return $grouped->map(function ($group) {
                    $first = $group->first();
                    $dates = $group->pluck('data')->map(fn ($d) => Carbon::parse($d));
                    $minDate = $dates->min()->format('d/m/Y');
                    $maxDate = $dates->max()->format('d/m/Y');

                    $daysOfWeek = $dates->map(fn ($d) => ucfirst($d->locale('pt_BR')->dayName))->unique()->values();

                    $diasTexto = $daysOfWeek->count() > 1
                        ? $daysOfWeek->slice(0, -1)->implode(', ').' e '.$daysOfWeek->last()
                        : $daysOfWeek->first();

                    return (object) [
                        'is_summary' => true,
                        'texto' => "$diasTexto das ".
                                   Carbon::parse($first->horario_inicio)->format('H:i').
                                   ' às '.Carbon::parse($first->horario_fim)->format('H:i').
                                   ' (Turno: '.$first->agenda->turno.') no espaço '.$first->agenda->espaco->nome.
                                   " - período de $minDate a $maxDate (".$group->count().' sessões)',
                    ];
                })->values()->toArray();
            },
        );
    }

    /**
     * @return HasMany<Horario, $this>
     */
    public function horarios(): HasMany
    {
        return $this->hasMany(Horario::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
