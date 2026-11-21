<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Models\User;
use App\Notifications\UserRemovedAsManagerNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UserRemovedAsManagerNotificationTest extends TestCase
{
    private const CHAVES_DA_REMOCAO = [
        'Dear :name,',
        'You were removed as manager of the space ":espaco" for the :turno shift.',
        'You are no longer responsible for reviewing reservation requests for this space in this shift.',
        'To view your spaces, click the button below:',
        'View My Spaces',
        'You were removed as schedule manager.',
        'You were removed as schedule manager in our system.',
        'You no longer have any schedule or space management permissions.',
        'To access the home page, click the button below:',
        'Go to Home Page',
        'Space Management',
        'Morning',
        'Afternoon',
        'Evening',
        'Regards,',
        'UniEspaços Team',
    ];

    /**
     * @return iterable<string, array{string}>
     */
    public static function arquivosDeIdiomaProvider(): iterable
    {
        yield 'pt.json' => ['pt.json'];
        yield 'pt_BR.json' => ['pt_BR.json'];
        yield 'es.json' => ['es.json'];
    }

    #[Test]
    public function notificacao_e_enfileirada(): void
    {
        $notificacao = new UserRemovedAsManagerNotification(User::factory()->make());

        $this->assertInstanceOf(ShouldQueue::class, $notificacao);
    }

    #[Test]
    public function remocao_geral_em_espanhol_traz_titulo_descricao_e_assunto_traduzidos(): void
    {
        app()->setLocale('es');
        $gestor = User::factory()->make();

        $notificacao = new UserRemovedAsManagerNotification($gestor);
        $dados = $notificacao->toArray($gestor);

        $this->assertSame('Gestión de Espacios', $dados['titulo']);
        $this->assertSame('Usted fue removido como gestor de agenda.', $dados['descricao']);

        $mail = $notificacao->toMail($gestor);
        $this->assertSame('Usted fue removido como gestor de agenda.', $mail->subject);
        $this->assertStringContainsString('Estimado(a) '.e($gestor->name).',', (string) $mail->render());
        $this->assertStringContainsString('Usted fue removido(a) como gestor(a) de agenda en nuestro sistema.', (string) $mail->render());
        $this->assertStringContainsString('Ir a la página de inicio', (string) $mail->render());
    }

    #[Test]
    public function remocao_de_espaco_em_espanhol_traz_espaco_e_turno_traduzido(): void
    {
        app()->setLocale('es');
        $gestor = User::factory()->make();

        $notificacao = new UserRemovedAsManagerNotification($gestor, 'Laboratorio 3', 'noite');
        $dados = $notificacao->toArray($gestor);

        $this->assertSame('Gestión de Espacios', $dados['titulo']);
        $this->assertSame('Usted fue removido(a) como gestor(a) del espacio "Laboratorio 3" en el turno Noche.', $dados['descricao']);

        $mail = (string) $notificacao->toMail($gestor)->render();
        $this->assertStringContainsString(e('Usted fue removido(a) como gestor(a) del espacio "Laboratorio 3" en el turno Noche.'), $mail);
        $this->assertStringContainsString('Ver Mis Espacios', $mail);
    }

    #[Test]
    #[DataProvider('arquivosDeIdiomaProvider')]
    public function chaves_da_remocao_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $caminho = dirname(__DIR__, 3).'/lang/'.$arquivo;
        $traducoes = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($traducoes);

        foreach (self::CHAVES_DA_REMOCAO as $chave) {
            $this->assertArrayHasKey($chave, $traducoes, "Chave ausente em {$arquivo}: {$chave}");
            $this->assertIsString($traducoes[$chave]);
            $this->assertNotSame('', $traducoes[$chave], "Tradução vazia em {$arquivo}: {$chave}");
        }
    }
}
