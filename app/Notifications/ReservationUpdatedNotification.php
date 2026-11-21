<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationUpdatedNotification extends BaseNotification
{
    public Reserva $reserva;

    public function __construct(Reserva $reserva)
    {
        parent::__construct(
            'Reserva Atualizada',
            "Sua reserva '{$reserva->titulo}' foi atualizada com sucesso.",
            route('reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reserva Atualizada: '.$this->reserva->titulo)
            ->view('emails.reservations.reservation_updated', ['reserva' => $this->reserva, 'url' => $this->url]);
    }
}
