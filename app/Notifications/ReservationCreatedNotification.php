<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\SituacaoReserva\SituacaoReservaEnum;
use App\Models\Reserva;
use Illuminate\Notifications\Messages\MailMessage;

class ReservationCreatedNotification extends BaseNotification
{
    public Reserva $reserva;

    public function __construct(Reserva $reserva)
    {
        [$titulo, $descricao] = match ($reserva->situacao) {
            SituacaoReservaEnum::DEFERIDA->value => [
                'Reserva Criada e Deferida',
                'Sua reserva "'.$reserva->titulo.'" foi criada e deferida automaticamente.',
            ],
            SituacaoReservaEnum::PARCIALMENTE_DEFERIDA->value => [
                'Solicitação de Reserva Parcialmente Deferida',
                'Sua reserva "'.$reserva->titulo.'" foi criada com parte dos horários deferidos automaticamente e os demais em análise.',
            ],
            default => [
                'Solicitação de Reserva Enviada',
                'Sua solicitação de reserva para "'.$reserva->titulo.'" foi enviada e está em análise.',
            ],
        };

        parent::__construct(
            $titulo,
            $descricao,
            route('reservas.show', $reserva->id)
        );
        $this->reserva = $reserva;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subjectPrefix = $this->reserva->situacao === SituacaoReservaEnum::DEFERIDA->value
            ? 'Reserva Criada e Deferida: '
            : 'Solicitação de Reserva Enviada: ';

        return (new MailMessage)
            ->subject($subjectPrefix.$this->reserva->titulo)
            ->view('emails.reservations.reservation_created', ['reserva' => $this->reserva, 'url' => $this->url]);
    }
}
