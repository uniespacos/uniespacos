<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationCanceledNotification extends BaseNotification
{
    public Reserva $reserva;

    public User $canceler;

    public function __construct(Reserva $reserva, User $canceler)
    {
        parent::__construct(
            'Reserva Cancelada',
            'A reserva "'.$reserva->titulo.'" foi cancelada.',
            route('gestor.reservas.index')
        );
        $this->reserva = $reserva;
        $this->canceler = $canceler;
    }

    /**
     * @return array<string, int>
     */
    protected function identificadores(): array
    {
        return [
            'reserva_id' => $this->reserva->id,
            'cancelador_id' => $this->canceler->id,
        ];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reserva Cancelada: '.$this->reserva->titulo)
            ->view('emails.reservations.reservation_canceled', [
                'reserva' => $this->reserva,
                'canceler' => $this->canceler,
                'url' => $this->url,
            ]);
    }
}
