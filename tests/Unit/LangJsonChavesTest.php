<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class LangJsonChavesTest extends TestCase
{
    private const CHAVES_DE_MINIMIZACAO_VALIDACAO_E_FOTO = [
        'an internal error occurred. Please try again.',
        'The reason must be a valid text.',
        'The reason may not have more than :max characters.',
        'The description may not have more than :max characters.',
        'The uploaded image could not be processed. Please send another file.',
    ];

    private const CHAVES_DE_TEXTO_NOVO = [
        'Conflict with another approved reservation at this time.',
        'New Reservation Request',
        "A new reservation request for ':titulo_reserva' was submitted.",
        'Reservation Canceled',
        'The reservation ":titulo_reserva" was canceled.',
    ];

    private const CHAVES_DE_TEXTO_DA_T25 = [
        'This account cannot be deleted while it manages a schedule. Ask the institutional team to remove the schedule management first.',
        'User account anonymized successfully.',
        'Anonymized user',
        'Unidentified requester',
    ];

    private const CHAVES_DE_TEXTO_DA_REVISAO_T25 = [
        'This account is anonymized and can no longer be changed.',
    ];

    private const CHAVES_DE_RESPOSTA_NEUTRA_DA_RECUPERACAO_DE_SENHA = [
        'If an account exists with this email, we will send a link to reset your password.',
    ];

    private const CHAVES_DE_PREFIXOS_DE_ERRO_INSTITUCIONAL = [
        'Error creating module: :message',
        'Error updating module: :message',
        'Error removing module: :message',
        'Error updating institution: :message',
        'Error updating permissions: :message',
        'Error creating unit: :message',
        'Error updating unit: :message',
        'Error deleting unit: :message',
        'Error creating sector: :message',
        'Error updating sector: :message',
        'Error removing sector: :message',
    ];

    private const CHAVES_DA_NOTIFICACAO_DE_FALHA_NA_RESERVA = [
        'Failed to Update Reservation',
        'Failed to Update Reservation: :titulo',
        "An error occurred while processing the update of your reservation ':titulo'. Please try again.",
    ];

    private const CHAVES_DO_RODAPE_DE_PRIVACIDADE_DO_EMAIL = [
        'Privacy Policy',
        'Questions about your personal data? Contact the UESB Legal Department (provisional channel):',
    ];

    private const CHAVES_DE_MENSAGENS_FLASH_DOS_CONTROLLERS = [
        'This space does not have a manager defined yet.',
        'Space added to favorites!',
        'Space removed from favorites!',
        'Assessment sent for background processing. You will be notified when it is complete.',
        'An error occurred while sending the assessment for processing.',
        'Space created successfully!',
        'An unexpected error occurred while creating the space.',
        'Space updated successfully!',
        'An unexpected error occurred while updating the space.',
        'The password provided is incorrect.',
        'Space deleted successfully!',
        'Error deleting, please try again.',
        'Managers updated successfully!',
        'An error occurred while updating the space managers.',
        'Institution created successfully.',
        'Institution updated successfully.',
        'Institution deleted successfully.',
        'Module created successfully!',
        'Module updated successfully!',
        'Module removed successfully!',
        "Role ':nome' created successfully.",
        "Role ':nome' updated successfully.",
        "Role ':nome' removed successfully.",
        "Permissions of role ':nome' updated successfully.",
        'Sector creation is done from the sectors administration panel.',
        'Sector registered successfully!',
        'Sector editing is done from the sectors administration panel.',
        'Sector updated successfully!',
        'Sector removed successfully!',
        'Unit created successfully.',
        'Unit updated successfully.',
        'Unit deleted successfully.',
        'User created successfully.',
        'User updated successfully.',
        'Verification email resent.',
        'Permissions updated successfully.',
        'Error deleting user.',
        'Password reset link sent.',
        'Could not send the reset link.',
        'Notifications marked as read.',
        'Could not send your request for processing. Please try again.',
        'Your change request was sent for processing.',
        'An error occurred while sending the update for processing.',
        'Reservation cancelled successfully!',
        'Error cancelling the reservation. Please try again.',
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

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_textos_novos_de_minimizacao_validacao_e_foto_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_MINIMIZACAO_VALIDACAO_E_FOTO);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_textos_novos_da_t24_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_TEXTO_NOVO);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_textos_novos_da_t25_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_TEXTO_DA_T25);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_textos_da_revisao_da_t25_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_TEXTO_DA_REVISAO_T25);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_resposta_neutra_da_recuperacao_de_senha_existe_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_RESPOSTA_NEUTRA_DA_RECUPERACAO_DE_SENHA);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_prefixos_de_erro_institucional_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_PREFIXOS_DE_ERRO_INSTITUCIONAL);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_notificacao_de_falha_na_reserva_existe_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DA_NOTIFICACAO_DE_FALHA_NA_RESERVA);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_rodape_de_privacidade_do_email_existe_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DO_RODAPE_DE_PRIVACIDADE_DO_EMAIL);
    }

    #[DataProvider('arquivosDeIdiomaProvider')]
    public function test_mensagens_flash_dos_controllers_existem_em_cada_arquivo_de_idioma(string $arquivo): void
    {
        $this->assertChavesTraduzidas($arquivo, self::CHAVES_DE_MENSAGENS_FLASH_DOS_CONTROLLERS);
    }

    /**
     * @param  list<string>  $chaves
     */
    private function assertChavesTraduzidas(string $arquivo, array $chaves): void
    {
        $caminho = dirname(__DIR__, 2).'/lang/'.$arquivo;
        $traducoes = json_decode((string) file_get_contents($caminho), true, 512, JSON_THROW_ON_ERROR);

        $this->assertIsArray($traducoes);

        foreach ($chaves as $chave) {
            $this->assertArrayHasKey($chave, $traducoes, "Chave ausente em {$arquivo}: {$chave}");
            $this->assertIsString($traducoes[$chave]);
            $this->assertNotSame('', $traducoes[$chave], "Tradução vazia em {$arquivo}: {$chave}");
        }
    }
}
