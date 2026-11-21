<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\Agenda\AgendaEnum;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class UserRemovedAsManagerNotification extends BaseNotification
{
    public User $user;

    public ?string $espacoNome;

    public ?string $turno;

    public function __construct(User $user, ?string $espacoNome = null, ?string $turno = null)
    {
        $this->user = $user;
        $this->espacoNome = $espacoNome;
        $this->turno = $turno;

        if ($espacoNome && $turno) {
            parent::__construct(
                (string) __('Space Management'),
                (string) __('You were removed as manager of the space ":espaco" for the :turno shift.', [
                    'espaco' => $espacoNome,
                    'turno' => self::rotuloDoTurno($turno),
                ]),
                route('espacos.index')
            );

            return;
        }

        parent::__construct(
            (string) __('Space Management'),
            (string) __('You were removed as schedule manager.'),
            route('espacos.index')
        );
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject((string) __('You were removed as schedule manager.'))
            ->view('emails.users.user_removed_as_manager', [
                'user' => $this->user,
                'espacoNome' => $this->espacoNome,
                'turno' => $this->turno !== null ? self::rotuloDoTurno($this->turno) : null,
                'url' => $this->url,
            ]);
    }

    private static function rotuloDoTurno(string $turno): string
    {
        return (string) match (AgendaEnum::tryFrom($turno)) {
            AgendaEnum::MANHA => __('Morning'),
            AgendaEnum::TARDE => __('Afternoon'),
            AgendaEnum::NOITE => __('Evening'),
            null => $turno,
        };
    }
}
