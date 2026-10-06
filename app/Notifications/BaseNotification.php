<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Agenda;
use App\Models\Horario;
use App\Models\Reserva;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    public string $titulo;

    public string $descricao;

    public string $url;

    public function __construct(string $titulo, string $descricao, string $url)
    {
        $this->titulo = $titulo;
        $this->descricao = $descricao;
        $this->url = str_replace('http://localhost', config('app.url'), $url);
    }

    /**
     * Get the backoff strategy in seconds for failed notification attempts.
     *
     * @return array<int>
     */
    public function backoff(): array
    {
        return [30, 60, 120, 300];
    }

    /**
     * Get the notification's delivery channels.
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

            $managerIds = Agenda::whereIn(
                'id',
                Horario::where('reserva_id', $this->reserva->id)->select('agenda_id')
            )->pluck('user_id')->unique();

            $isSoleManager = $managerIds->count() === 1 && $managerIds->first() === $notifiable->id;

            if ($isApplicant && $isSoleManager) {
                return $channels;
            }
        }

        $channels[] = 'mail';

        return $channels;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->line($this->titulo)
            ->action('Notification Action', $this->url)
            ->line($this->descricao);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'titulo' => $this->titulo,
            'descricao' => $this->descricao,
            'url' => $this->url,
        ];
    }

    /**
     * Get the broadcastable representation of the notification.
     */
    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage([
            'titulo' => $this->titulo,
            'descricao' => $this->descricao,
            'url' => $this->url,
        ]);
    }
}
