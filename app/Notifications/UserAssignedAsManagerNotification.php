<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\Agenda\AgendaEnum;
use App\Models\Espaco;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class UserAssignedAsManagerNotification extends BaseNotification
{
    public User $manager;

    public ?string $espacoNome;

    public ?string $turnoRotulo;

    public function __construct(User $manager, ?Espaco $espaco = null, ?AgendaEnum $turno = null)
    {
        $this->manager = $manager;
        $this->espacoNome = null;
        $this->turnoRotulo = null;

        if ($espaco && $turno) {
            $this->espacoNome = $espaco->nome;
            $this->turnoRotulo = self::rotuloDoTurno($turno);

            parent::__construct(
                (string) __('Space Management'),
                (string) __('You were designated as manager of the space ":espaco" for the :turno shift.', [
                    'espaco' => $espaco->nome,
                    'turno' => $this->turnoRotulo,
                ]),
                route('espacos.show', $espaco->id)
            );

            return;
        }

        parent::__construct(
            (string) __('Space Management'),
            (string) __('You were designated as schedule manager.'),
            route('espacos.index')
        );
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject((string) __('You were designated as schedule manager.'))
            ->view('emails.users.user_assigned_as_manager', [
                'manager' => $this->manager,
                'espacoNome' => $this->espacoNome,
                'turno' => $this->turnoRotulo,
                'url' => $this->url,
            ]);
    }

    private static function rotuloDoTurno(AgendaEnum $turno): string
    {
        return (string) match ($turno) {
            AgendaEnum::MANHA => __('Morning'),
            AgendaEnum::TARDE => __('Afternoon'),
            AgendaEnum::NOITE => __('Evening'),
        };
    }
}
