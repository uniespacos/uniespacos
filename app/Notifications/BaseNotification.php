<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use App\Notifications\Concerns\HasQueueableRetry;
use App\Support\CamposPublicosNotificacao;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class BaseNotification extends Notification implements ShouldQueue
{
    use HasQueueableRetry, Queueable;

    public string $titulo;

    public string $descricao;

    public string $url;

    private ?int $gestorUnicoId = null;

    private bool $gestorUnicoResolvido = false;

    public function __construct(string $titulo, string $descricao, string $url)
    {
        $this->titulo = $titulo;
        $this->descricao = $descricao;
        $this->url = str_replace('http://localhost', config('app.url'), $url);
    }

    /**
     * Suppresses the mail channel when the notifiable is both the reservation owner
     * and the sole manager of all associated agendas (self-approved reservation).
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database', 'broadcast'];

        if (property_exists($this, 'reserva') && $this->reserva instanceof Reserva) {
            $isApplicant = $this->reserva->user_id === $notifiable->id;

            if ($isApplicant && $this->gestorUnicoId($this->reserva) === $notifiable->id) {
                return $channels;
            }
        }

        $channels[] = 'mail';

        return $channels;
    }

    /**
     * O gestor da reserva não depende do destinatário: é resolvido uma vez por instância,
     * para que o loop de `via()` em `NotificationSender` não repita a consulta por notifiable.
     */
    private function gestorUnicoId(Reserva $reserva): ?int
    {
        if (! $this->gestorUnicoResolvido) {
            $managerIds = Agenda::whereIn(
                'id',
                Horario::where('reserva_id', $reserva->id)->select('agenda_id')
            )->pluck('user_id')->unique();

            $gestorUnico = $managerIds->count() === 1 ? $managerIds->first() : null;

            $this->gestorUnicoId = is_numeric($gestorUnico) ? (int) $gestorUnico : null;
            $this->gestorUnicoResolvido = true;
        }

        return $this->gestorUnicoId;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line($this->titulo)
            ->action('Notification Action', $this->url)
            ->line($this->descricao);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage(CamposPublicosNotificacao::dadosPublicos($this->payload()));
    }

    /**
     * Identificadores persistidos junto da descrição; nunca nomes de pessoas.
     *
     * @return array<string, int|null>
     */
    protected function identificadores(): array
    {
        return [];
    }

    /**
     * Chave de tradução do front (`chave`) e seus parâmetros; o front monta o texto no idioma de quem lê.
     *
     * @return array{chave?: string, parametros?: array<string, string>}
     */
    protected function traducaoNoFront(): array
    {
        return [];
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        return array_merge([
            'titulo' => $this->titulo,
            'descricao' => $this->descricao,
            'url' => $this->url,
        ], $this->identificadores(), $this->traducaoNoFront());
    }
}
