<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationFailedNotification extends BaseNotification
{
    public string $reservationTitle;

    public User $user;

    public function __construct(string $reservationTitle, User $user)
    {
        parent::__construct(
            'Falha na sua solicitação de reserva',
            'Houve um erro ao processar sua solicitação para "'.$reservationTitle.'". Por favor, tente novamente ou contate o suporte.',
            route('reservas.index')
        );
        $this->reservationTitle = $reservationTitle;
        $this->user = $user;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Falha na sua solicitação de reserva: '.$this->reservationTitle)
            ->view('emails.reservations.reservation_failed', [
                'reservationTitle' => $this->reservationTitle,
                'user' => $this->user,
                'url' => $this->url,
            ]);
    }
}
