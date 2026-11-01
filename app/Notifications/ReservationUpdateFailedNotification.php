<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationUpdateFailedNotification extends BaseNotification
{
    public Reserva $reserva;

    public User $user;

    public function __construct(Reserva $reserva, User $user)
    {
        $locale = app()->getLocale();

        parent::__construct(
            __('Failed to Update Reservation', [], $locale),
            __("An error occurred while processing the update of your reservation ':titulo'. Please try again.", ['titulo' => $reserva->titulo], $locale),
            route('reservas.edit', $reserva->id)
        );
        $this->locale($locale);
        $this->reserva = $reserva;
        $this->user = $user;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(__('Failed to Update Reservation: :titulo', ['titulo' => $this->reserva->titulo]))
            ->view('emails.reservations.reservation_failed', [
                'reservationTitle' => $this->reserva->titulo,
                'user' => $this->user,
                'url' => $this->url,
            ]);
    }
}
