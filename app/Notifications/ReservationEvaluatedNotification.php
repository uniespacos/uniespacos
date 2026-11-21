<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Reserva;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationEvaluatedNotification extends BaseNotification
{
    public Reserva $reserva;

    public string $statusAvaliacao;

    public User $evaluator;

    public function __construct(Reserva $reserva, string $statusAvaliacao, User $evaluator)
    {
        parent::__construct(
            'Reserva Avaliada',
            "Sua reserva para '{$reserva->titulo}' foi {$statusAvaliacao}.",
            route('reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
        $this->statusAvaliacao = $statusAvaliacao;
        $this->evaluator = $evaluator;
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Reserva Avaliada: '.$this->reserva->titulo)
            ->view('emails.reservations.reservation_evaluated', [
                'reserva' => $this->reserva,
                'statusAvaliacao' => $this->statusAvaliacao,
                'evaluator' => $this->evaluator,
                'url' => $this->url,
            ]);
    }
}
