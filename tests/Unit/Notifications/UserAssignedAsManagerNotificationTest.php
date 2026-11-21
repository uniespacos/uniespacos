<?php

declare(strict_types=1);

namespace Tests\Unit\Notifications;

use App\Enums\Agenda\AgendaEnum;
use App\Models\Agenda;
use App\Models\Espaco;
use App\Models\User;
use App\Notifications\UserAssignedAsManagerNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class UserAssignedAsManagerNotificationTest extends TestCase
{
    private const CHAVES_DA_DESIGNACAO = [
        'Dear :name,',
        'You were designated as manager of the space ":espaco" for the :turno shift.',
        'From now on, you are responsible for reviewing reservation requests for this space in this shift.',
        'To manage this space, click the button below:',
        'Manage Space',
        'You were designated as schedule manager in our system.',
        'From now on, you can manage the schedules and spaces assigned to you.',
        'To access the space management panel, click the button below:',
        'Access Management Panel',
        'UniEspaços Team',
        'Space Management',
        'You were designated as schedule manager.',
        'Morning',
        'Afternoon',
        'Evening',
        'Regards,',
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
        $notificacao = new UserAssignedAsManagerNotification(User::factory()->make());

        $this->assertInstanceOf(ShouldQueue::class, $notificacao);
    }

    #[Test]
    public function url_aponta_para_o_espaco_recebido_mesmo_quando_o_gestor_tem_outro_espaco(): void
    {
        $gestor = User::factory()->create();
        $espacoAntigo = Espaco::factory()->create();
        Agenda::where('espaco_id', $espacoAntigo->id)->where('turno', 'manha')->update(['user_id' => $gestor->id]);
        $espacoDesignado = Espaco::factory()->create();

        $notificacao = new UserAssignedAsManagerNotification($gestor, $espacoDesignado, AgendaEnum::TARDE);

        $this->assertSame(
            str_replace('http://localhost', config('app.url'), route('espacos.show', $espacoDesignado->id)),
            $notificacao->url,
        );
    }

    #[Test]
    public function texto_da_designacao_em_portugues_traz_espaco_e_turno_traduzido(): void
    {
        app()->setLocale('pt_BR');
        $espaco = Espaco::factory()->create(['nome' => 'Laboratório 3']);

        $gestor = User::factory()->make();

        $dados = (new UserAssignedAsManagerNotification($gestor, $espaco, AgendaEnum::MANHA))->toArray($gestor);

        $this->assertSame('Gestão de Espaços', $dados['titulo']);
        $this->assertSame('Você foi designado(a) como gestor(a) do espaço "Laboratório 3" no turno Manhã.', $dados['descricao']);
    }

    #[Test]
    public function texto_da_designacao_em_espanhol_traz_espaco_e_turno_traduzido(): void
    {
        app()->setLocale('es');
        $espaco = Espaco::factory()->create(['nome' => 'Laboratorio 3']);
        $gestor = User::factory()->make();

        $notificacao = new UserAssignedAsManagerNotification($gestor, $espaco, AgendaEnum::NOITE);
        $dados = $notificacao->toArray($gestor);

        $this->assertSame('Gestión de Espacios', $dados['titulo']);
        $this->assertSame('Usted fue designado(a) como gestor(a) del espacio "Laboratorio 3" en el turno Noche.', $dados['descricao']);

        $mail = $notificacao->toMail($gestor);
        $this->assertSame('Usted fue designado como gestor de agenda.', $mail->subject);
        $this->assertStringContainsString('Gestionar Espacio', (string) $mail->render());
        $this->assertStringContainsString('Estimado(a) '.e($gestor->name).',', (string) $mail->render());
    }

    #[Test]
    public function designacao_geral_sem_espaco_aponta_para_o_indice_de_espacos(): void
    {
        app()->setLocale('pt_BR');

        $notificacao = new UserAssignedAsManagerNotification(User::factory()->make());

        $this->assertSame('Você foi designado como gestor de agenda.', $notificacao->descricao);
        $this->assertSame(str_replace('http://localhost', config('app.url'), route('espacos.index')), $notificacao->url);
    }

    #[Test]
    #[DataProvider('arquivosDeIdiomaProvider')]
    public function chaves_da_designacao_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $caminho = dirname(__DIR__, 3).'/lang/'.$arquivo;
        $traducoes = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($traducoes);

        foreach (self::CHAVES_DA_DESIGNACAO as $chave) {
            $this->assertArrayHasKey($chave, $traducoes, "Chave ausente em {$arquivo}: {$chave}");
            $this->assertIsString($traducoes[$chave]);
            $this->assertNotSame('', $traducoes[$chave], "Tradução vazia em {$arquivo}: {$chave}");
        }
    }
}
