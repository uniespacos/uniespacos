<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\SituacaoReserva\ModoArquivoEnum;
use App\Enums\SituacaoReserva\OrdenacaoReservaEnum;
use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use Carbon\Carbon;
use Database\Factories\ReservaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property bool $can_update Set dynamically in ReservaService based on policy check.
 * @property string|null $existing_justification Set dynamically in ReservaService with first non-null justificativa.
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
        'cache_validated_at',
    ];

    /**
     * @var array<string, string>
     */
    protected $casts = [
        'conflict_cache' => 'array',
        'cache_validated_at' => 'datetime',
    ];

    /**
     * Aplica o eixo de arquivamento a uma listagem.
     *
     * Fica no model, e nao em cada repositorio, porque a regra estava escrita
     * de duas formas divergentes: getPaginatedForGestor tinha o default certo,
     * e getPaginatedForUser aplicava `!= 'inativa'` incondicionalmente — o que
     * transformava um filtro por arquivadas na contradicao
     * `situacao != 'inativa' AND situacao = 'inativa'`. Uma definicao so
     * elimina a chance de as duas divergirem de novo.
     *
     * @param  Builder<Reserva>  $query
     * @return Builder<Reserva>
     */
    public function scopeArquivo(Builder $query, mixed $modo): Builder
    {
        return match (ModoArquivoEnum::fromFiltro($modo)) {
            ModoArquivoEnum::ARQUIVADAS => $query->where('situacao', 'inativa'),
            ModoArquivoEnum::TODAS => $query,
            ModoArquivoEnum::ATIVAS => $query->where('situacao', '!=', 'inativa'),
        };
    }

    /**
     * Aplica o criterio de ordenacao escolhido pelo usuario nas listagens
     * (Minhas Reservas / Gerenciar Reservas).
     *
     * Por situacao usa uma prioridade fixa (pendente > parcial > indeferida >
     * deferida > inativa) em vez da ordem alfabetica das cases do enum, que
     * nao carrega esse significado. `->latest()` como desempate: dentro do
     * mesmo grupo de situacao, a mais recente primeiro.
     *
     * @param  Builder<Reserva>  $query
     * @return Builder<Reserva>
     */
    public function scopeOrdenar(Builder $query, mixed $criterio): Builder
    {
        return match (OrdenacaoReservaEnum::fromFiltro($criterio)) {
            OrdenacaoReservaEnum::SITUACAO => $query->orderByRaw(
                "CASE situacao
                    WHEN 'em_analise' THEN 1
                    WHEN 'parcialmente_deferida' THEN 2
                    WHEN 'indeferida' THEN 3
                    WHEN 'deferida' THEN 4
                    WHEN 'inativa' THEN 5
                    ELSE 6
                END"
            )->latest(),
            OrdenacaoReservaEnum::DATA_SOLICITACAO => $query->latest(),
        };
    }

    /**
     * Returns a human-readable label for the current situacao value.
     */
    public function getSituacaoFormatadaAttribute(): string
    {
        return SituacaoReservaEnum::labelDe($this->situacao);
    }

    /**
     * Returns a summary of the reservation's horarios.
     * For 10 or fewer horarios, returns a detailed list.
     * For larger sets, groups by agenda/time slot showing date ranges and days of the week.
     *
     * @return array<int, object>
     */
    public function getResumoHorariosAttribute(): array
    {
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

    /**
     * Adiciona contadores de horários por status à query.
     * Útil para exibição na lista do gestor.
     */
    public function scopeWithHorariosStats(Builder $query, ?array $agendaIds = null): Builder
    {
        return $query
            ->addSelect([
                'horarios_deferida' => Horario::query()
                    ->whereColumn('reserva_id', 'reservas.id')
                    ->when($agendaIds, fn ($q) => $q->whereIn('agenda_id', $agendaIds))
                    ->where('situacao', 'deferida')
                    ->selectRaw('count(*)'),
                'horarios_indeferida' => Horario::query()
                    ->whereColumn('reserva_id', 'reservas.id')
                    ->when($agendaIds, fn ($q) => $q->whereIn('agenda_id', $agendaIds))
                    ->where('situacao', 'indeferida')
                    ->selectRaw('count(*)'),
                'horarios_em_analise' => Horario::query()
                    ->whereColumn('reserva_id', 'reservas.id')
                    ->when($agendaIds, fn ($q) => $q->whereIn('agenda_id', $agendaIds))
                    ->where('situacao', 'em_analise')
                    ->selectRaw('count(*)'),
            ]);
    }
}
