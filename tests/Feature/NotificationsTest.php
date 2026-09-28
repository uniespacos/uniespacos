<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\Reserva;
use App\Models\Setor;
use App\Models\User;
use App\Notifications\NewReservationNotification;
use App\Notifications\ReservationCanceledNotification;
use App\Notifications\ReservationCreatedNotification;
use App\Notifications\ReservationEvaluatedNotification;
use App\Notifications\ReservationFailedNotification;
use App\Notifications\ReservationUpdatedNotification;
use App\Notifications\ReservationUpdateFailedNotification;
use App\Notifications\SectorUpdatedNotification;
use App\Notifications\UserAssignedAsManagerNotification;
use App\Notifications\UserRemovedAsManagerNotification;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected User $manager;

    protected Reserva $reserva;

    protected Espaco $espaco;

    protected Agenda $agenda;

    protected Setor $setor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->manager = User::factory()->create();
        $this->espaco = Espaco::factory()->create();
        $this->agenda = Agenda::factory()->for($this->espaco)->create(['user_id' => $this->manager->id]);
        $this->reserva = Reserva::factory()->for($this->user)->create();
        $this->reserva->horarios()->createMany([
            ['data' => '2026-03-01', 'horario_inicio' => '08:00:00', 'horario_fim' => '09:00:00', 'agenda_id' => $this->agenda->id, 'situacao' => 'em_analise'],
            ['data' => '2026-03-02', 'horario_inicio' => '10:00:00', 'horario_fim' => '11:00:00', 'agenda_id' => $this->agenda->id, 'situacao' => 'em_analise'],
        ]);

        $this->setor = Setor::factory()->create();
        $this->user->setor_id = $this->setor->id;
        $this->user->save();
    }

    public function test_new_reservation_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new NewReservationNotification($this->reserva);

        // Test Mail
        $mailMessage = $notification->toMail($this->manager);
        $this->assertStringContainsString('Nova Solicitação de Reserva: '.$this->reserva->nome, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('Uma nova solicitação de reserva foi criada:', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(e($this->reserva->user->name), $mailData);
        $this->assertStringContainsString(route('gestor.reservas.show', $this->reserva->id), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_evaluated_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationEvaluatedNotification($this->reserva, 'deferida', $this->manager);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Reserva Avaliada: '.$this->reserva->nome, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();

        $this->assertStringContainsString('foi avaliada.', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString('Deferida', $mailData);
        $this->assertStringContainsString('Solicitante:', $mailData);
        $this->assertStringContainsString(e($this->user->name), $mailData);
        $this->assertStringContainsString('Avaliador:', $mailData);
        $this->assertStringContainsString(e($this->manager->name), $mailData);
        $this->assertStringContainsString(route('reservas.show', $this->reserva->id), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_created_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationCreatedNotification($this->reserva);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Solicitação de Reserva Enviada: '.$this->reserva->titulo, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('criada com sucesso e está aguardando avaliação.', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(e($this->reserva->user->name), $mailData);
        $this->assertStringContainsString(route('reservas.show', $this->reserva->id), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_failed_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationFailedNotification($this->reserva->titulo, $this->user);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Falha na sua solicitação de reserva: '.$this->reserva->titulo, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('Houve um erro ao processar sua solicitação', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(e($this->user->name), $mailData);
        $this->assertStringContainsString(route('reservas.index'), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_canceled_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationCanceledNotification($this->reserva, $this->user);

        // Test Mail
        $mailMessage = $notification->toMail($this->manager);
        $this->assertStringContainsString('Reserva Cancelada: '.$this->reserva->titulo, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('Uma reserva foi cancelada pelo solicitante:', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(e($this->user->name), $mailData);
        $this->assertStringContainsString(route('gestor.reservas.index'), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_updated_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationUpdatedNotification($this->reserva);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Reserva Atualizada: '.$this->reserva->titulo, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('foi atualizada com sucesso.', $mailData);
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(route('reservas.show', $this->reserva->id), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_reservation_update_failed_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new ReservationUpdateFailedNotification($this->reserva, $this->user);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Falha ao Atualizar Reserva: '.$this->reserva->titulo, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('Houve um erro ao processar sua solicitação', $mailData); // uses reservation_failed view
        $this->assertStringContainsString($this->reserva->titulo, $mailData);
        $this->assertStringContainsString(e($this->user->name), $mailData);
        $this->assertStringContainsString(route('reservas.edit', $this->reserva->id), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }

    public function test_user_assigned_as_manager_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        // Test for general manager assignment
        $generalManagerNotification = new UserAssignedAsManagerNotification($this->manager);
        $mailMessageGeneral = $generalManagerNotification->toMail($this->manager);
        $this->assertStringContainsString('Você foi designado como gestor de agenda.', $mailMessageGeneral->subject);

        $mailDataGeneral = (string) $mailMessageGeneral->render();
        $this->assertStringContainsString('Você foi designado(a) como gestor(a) de agenda em nosso sistema.', $mailDataGeneral);
        $this->assertStringContainsString(route('espacos.index'), $mailDataGeneral);

        $broadcastDataGeneral = $generalManagerNotification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastDataGeneral);
        $this->assertArrayHasKey('descricao', $broadcastDataGeneral);
        $this->assertArrayHasKey('url', $broadcastDataGeneral);

        // Test for space-specific manager assignment
        $spaceManagerNotification = new UserAssignedAsManagerNotification($this->manager, $this->espaco->nome, 'manha');
        $mailMessageSpace = $spaceManagerNotification->toMail($this->manager);

        $mailDataSpace = (string) $mailMessageSpace->render();
        $this->assertStringContainsString('Você foi designado(a) como gestor(a) do espaço', $mailDataSpace);
        $this->assertStringContainsString(route('espacos.show', $this->espaco->id), $mailDataSpace);

        $broadcastDataSpace = $spaceManagerNotification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastDataSpace);
        $this->assertArrayHasKey('descricao', $broadcastDataSpace);
        $this->assertArrayHasKey('url', $broadcastDataSpace);
    }

    public function test_user_removed_as_manager_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        // Test for general manager removal
        $generalRemovalNotification = new UserRemovedAsManagerNotification($this->manager);
        $mailMessageGeneral = $generalRemovalNotification->toMail($this->manager);
        $this->assertStringContainsString('Você foi removido como gestor de agenda.', $mailMessageGeneral->subject);

        $mailDataGeneral = (string) $mailMessageGeneral->render();
        $this->assertStringContainsString('Você foi removido(a) como gestor(a) de agenda em nosso sistema.', $mailDataGeneral);
        $this->assertStringContainsString(route('espacos.index'), $mailDataGeneral);

        $broadcastDataGeneral = $generalRemovalNotification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastDataGeneral);
        $this->assertArrayHasKey('descricao', $broadcastDataGeneral);
        $this->assertArrayHasKey('url', $broadcastDataGeneral);

        // Test for space-specific manager removal
        $spaceRemovalNotification = new UserRemovedAsManagerNotification($this->manager, $this->espaco->nome, 'manha');
        $mailMessageSpace = $spaceRemovalNotification->toMail($this->manager);

        $mailDataSpace = (string) $mailMessageSpace->render();
        $this->assertStringContainsString('Você foi removido(a) como gestor(a) do espaço', $mailDataSpace);
        $this->assertStringContainsString(route('espacos.index'), $mailDataSpace);

        $broadcastDataSpace = $spaceRemovalNotification->toBroadcast($this->manager)->data;
        $this->assertArrayHasKey('titulo', $broadcastDataSpace);
        $this->assertArrayHasKey('descricao', $broadcastDataSpace);
        $this->assertArrayHasKey('url', $broadcastDataSpace);
    }

    public function test_sector_updated_notification_sends_correct_mail_and_broadcast_data()
    {
        Notification::fake();

        $notification = new SectorUpdatedNotification($this->setor, $this->user);

        // Test Mail
        $mailMessage = $notification->toMail($this->user);
        $this->assertStringContainsString('Setor Atualizado: '.$this->setor->nome, $mailMessage->subject);

        $mailData = (string) $mailMessage->render();
        $this->assertStringContainsString('foi atualizado em nosso sistema.', $mailData);
        $this->assertStringContainsString($this->setor->nome, $mailData);
        $this->assertStringContainsString(e($this->user->name), $mailData);
        $this->assertStringContainsString(route('institucional.setors.index'), $mailData);

        // Test Broadcast
        $broadcastData = $notification->toBroadcast($this->user)->data;
        $this->assertArrayHasKey('titulo', $broadcastData);
        $this->assertArrayHasKey('descricao', $broadcastData);
        $this->assertArrayHasKey('url', $broadcastData);
    }
}
