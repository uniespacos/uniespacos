<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationCreatedNotification extends BaseNotification
{
    public Reserva $reserva;

    public function __construct(Reserva $reserva)
    {
        parent::__construct(
            'Solicitação de Reserva Enviada',
            'Sua solicitação de reserva para "'.$reserva->titulo.'" foi enviada e está em análise.',
            route('reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Solicitação de Reserva Enviada: '.$this->reserva->titulo)
            ->view('emails.reservations.reservation_created', ['reserva' => $this->reserva, 'url' => $this->url]);
    }
}
