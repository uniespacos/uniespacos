<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use Illuminate\Notifications\Messages\MailMessage;

class NewReservationNotification extends BaseNotification
{
    public Reserva $reserva;

    public function __construct(Reserva $reserva)
    {
        parent::__construct(
            'Nova Solicitação de Reserva',
            "Uma nova solicitação de reserva para '{$reserva->titulo}' foi enviada por '{$reserva->user->name}'.",
            route('gestor.reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Nova Solicitação de Reserva: '.$this->reserva->titulo)
            ->view('emails.reservations.new_reservation', ['reserva' => $this->reserva, 'url' => $this->url]);
    }
}
