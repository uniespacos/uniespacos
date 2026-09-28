<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Setor;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class SectorUpdatedNotification extends BaseNotification
{
    public Setor $setor;

    public User $user;

    public function __construct(Setor $setor, User $user)
    {
        parent::__construct(
            'Setor Atualizado',
            'O setor '.$setor->nome.' foi atualizado.',
            route('institucional.setors.index')
        );
        $this->setor = $setor;
        $this->user = $user;
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Setor Atualizado: '.$this->setor->nome)
            ->view('emails.users.sector_updated', [
                'setor' => $this->setor,
                'user' => $this->user,
                'url' => $this->url,
            ]);
    }
}
