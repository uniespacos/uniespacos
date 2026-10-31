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
            (string) __('New Reservation Request'),
            (string) __("A new reservation request for ':titulo_reserva' was submitted.", ['titulo_reserva' => $reserva->titulo]),
            route('gestor.reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
    }

    /**
     * @return array<string, int|null>
     */
    protected function identificadores(): array
    {
        return [
            'reserva_id' => $this->reserva->id,
            'solicitante_id' => $this->reserva->user_id,
        ];
    }

    /**
     * @return array{chave: string, parametros: array<string, string>}
     */
    protected function traducaoNoFront(): array
    {
        return [
            'chave' => 'reservas.nova_solicitacao',
            'parametros' => ['titulo_reserva' => $this->reserva->titulo],
        ];
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
