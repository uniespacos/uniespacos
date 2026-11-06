<?php

declare(strict_types=1);

namespace App\Services;

class VerificacaoDeAmbienteService
{
    public const OK = 'OK';

    public const AVISO = 'AVISO';

    public const FALHA = 'FALHA';

    private const PREFIXO_CHAVE = 'base64:';

    /**
     * @return list<array{checagem: string, status: string, motivo: string}>
     */
    public function executar(): array
    {
        return [
            $this->resultado('app_debug', $this->motivoAppDebug()),
            $this->resultado('app_key', $this->motivoAppKey()),
            $this->resultado('telescope_habilitado', $this->motivoTelescopeHabilitado()),
            $this->resultado('log_queries', $this->motivoLogQueries()),
            $this->resultado('session_secure', $this->motivoSessionSecure()),
            $this->resultado('session_same_site', $this->motivoSessionSameSite()),
            $this->resultado('senha_banco', $this->motivoSenhaBanco()),
            $this->resultado('chaves_reverb', $this->motivoChavesReverb()),
            $this->resultado('broadcast_padrao', $this->motivoBroadcastPadrao()),
            $this->resultado('app_env', $this->motivoAppEnv()),
            $this->resultado('app_url', $this->motivoAppUrl()),
            $this->resultado('nivel_de_log', $this->motivoNivelDeLog()),
            $this->resultado('session_encrypt', $this->motivoSessionEncrypt()),
            $this->resultado('session_http_only', $this->motivoSessionHttpOnly()),
            $this->resultado('mail_mailer', $this->motivoMailMailer()),
            $this->resultado('mail_host_smtp', $this->motivoMailHostSmtp()),
            $this->resultado('queue_sync', $this->motivoQueueSync()),
            $this->resultado('cache_padrao', $this->motivoCachePadrao()),
            $this->resultado('bcrypt_rounds', $this->motivoBcryptRounds()),
            $this->resultado('telescope_instalado', $this->motivoTelescopeInstalado()),
            $this->resultado('retencao_prazos', $this->motivoRetencaoPrazos()),
        ];
    }

    /**
     * @return array{checagem: string, status: string, motivo: string}
     */
    private function resultado(string $checagem, ?string $motivo): array
    {
        if ($motivo === null) {
            return ['checagem' => $checagem, 'status' => self::OK, 'motivo' => 'Conforme.'];
        }

        return ['checagem' => $checagem, 'status' => $this->nivel($checagem), 'motivo' => $motivo];
    }

    private function nivel(string $checagem): string
    {
        $nivel = config("verificacao-ambiente.niveis.{$checagem}");

        return is_string($nivel) && strtoupper($nivel) === self::AVISO ? self::AVISO : self::FALHA;
    }

    private function motivoAppDebug(): ?string
    {
        return config('app.debug') === true ? 'APP_DEBUG está ligado.' : null;
    }

    private function motivoAppKey(): ?string
    {
        $chave = config('app.key');

        if (! is_string($chave) || ! str_starts_with($chave, self::PREFIXO_CHAVE)) {
            return 'APP_KEY ausente ou sem prefixo base64:.';
        }

        $bytes = base64_decode(substr($chave, strlen(self::PREFIXO_CHAVE)), true);

        if ($bytes === false || strlen($bytes) !== $this->inteiro('verificacao-ambiente.limites.chave_bytes')) {
            return 'APP_KEY não decodifica para o tamanho esperado.';
        }

        return null;
    }

    private function motivoTelescopeHabilitado(): ?string
    {
        return config('telescope.enabled') === true ? 'Telescope está habilitado.' : null;
    }

    private function motivoLogQueries(): ?string
    {
        return config('logging.log_queries') === true ? 'Registro de SQL com valores está ligado.' : null;
    }

    private function motivoSessionSecure(): ?string
    {
        return config('session.secure') === true ? null : 'session.secure diferente de true.';
    }

    private function motivoSessionSameSite(): ?string
    {
        $sameSite = config('session.same_site');

        return is_string($sameSite) && strtolower($sameSite) === 'none' ? 'session.same_site igual a none.' : null;
    }

    private function motivoSenhaBanco(): ?string
    {
        $conexaoPadrao = config('database.default');
        $conexao = is_string($conexaoPadrao) ? config("database.connections.{$conexaoPadrao}") : null;

        if (! is_array($conexao)) {
            return 'Conexão padrão do banco não configurada.';
        }

        if (($conexao['driver'] ?? null) === 'sqlite') {
            return null;
        }

        $senha = $conexao['password'] ?? null;

        if (! is_string($senha) || $senha === '') {
            return 'Senha do banco vazia.';
        }

        if (in_array($senha, $this->lista('verificacao-ambiente.senhas_banco_proibidas'), true)) {
            return 'Senha do banco está na lista de senhas proibidas.';
        }

        return null;
    }

    private function motivoChavesReverb(): ?string
    {
        foreach (['key', 'secret', 'app_id'] as $campo) {
            $valor = config("broadcasting.connections.reverb.{$campo}");

            if (! is_string($valor) || trim($valor) === '') {
                return "Credencial do Reverb vazia ({$campo}).";
            }
        }

        return null;
    }

    private function motivoBroadcastPadrao(): ?string
    {
        return config('broadcasting.default') === 'reverb' ? null : 'broadcasting.default diferente de reverb.';
    }

    private function motivoAppEnv(): ?string
    {
        return in_array(config('app.env'), $this->lista('verificacao-ambiente.ambientes_aceitos'), true)
            ? null
            : 'APP_ENV fora dos ambientes aceitos.';
    }

    private function motivoAppUrl(): ?string
    {
        $url = config('app.url');
        $partes = is_string($url) ? parse_url($url) : false;

        if (! is_array($partes)) {
            return 'APP_URL inválida.';
        }

        if (($partes['scheme'] ?? null) !== 'https') {
            return 'APP_URL sem https.';
        }

        $host = $partes['host'] ?? null;

        if (is_string($host) && in_array(strtolower($host), $this->lista('verificacao-ambiente.hosts_locais'), true)) {
            return 'APP_URL aponta para host local.';
        }

        return null;
    }

    private function motivoNivelDeLog(): ?string
    {
        $canalPadrao = config('logging.default');
        $canais = $canalPadrao === 'stack'
            ? $this->lista('logging.channels.stack.channels')
            : [$canalPadrao];

        foreach ($canais as $canal) {
            if (! is_string($canal)) {
                continue;
            }

            if (in_array(config("logging.channels.{$canal}.level"), $this->lista('verificacao-ambiente.niveis_de_log_ruidosos'), true)) {
                return "Canal de log {$canal} com nível ruidoso.";
            }
        }

        return null;
    }

    private function motivoSessionEncrypt(): ?string
    {
        return config('session.encrypt') === true ? null : 'session.encrypt diferente de true.';
    }

    private function motivoSessionHttpOnly(): ?string
    {
        return config('session.http_only') === true ? null : 'session.http_only diferente de true.';
    }

    private function motivoMailMailer(): ?string
    {
        return in_array(config('mail.default'), $this->lista('verificacao-ambiente.mailers_inseguros'), true)
            ? 'mail.default é um mailer que não entrega e-mails.'
            : null;
    }

    private function motivoMailHostSmtp(): ?string
    {
        $host = config('mail.mailers.smtp.host');

        return is_string($host) && in_array(strtolower($host), $this->lista('verificacao-ambiente.hosts_smtp_de_desenvolvimento'), true)
            ? 'Host SMTP é de desenvolvimento.'
            : null;
    }

    private function motivoQueueSync(): ?string
    {
        return config('queue.default') === 'sync' ? 'queue.default é sync.' : null;
    }

    private function motivoCachePadrao(): ?string
    {
        return in_array(config('cache.default'), $this->lista('verificacao-ambiente.caches_inseguros'), true)
            ? 'cache.default não persiste entre requisições.'
            : null;
    }

    private function motivoBcryptRounds(): ?string
    {
        $rounds = $this->inteiro('hashing.bcrypt.rounds');
        $minimo = $this->inteiro('verificacao-ambiente.limites.bcrypt_rounds_minimos');

        return $rounds === null || $minimo === null || $rounds < $minimo
            ? 'Bcrypt rounds abaixo do mínimo.'
            : null;
    }

    private function motivoTelescopeInstalado(): ?string
    {
        $classe = config('verificacao-ambiente.classes.telescope');

        return is_string($classe) && class_exists($classe)
            ? 'Pacote Telescope instalado no projeto.'
            : null;
    }

    private function motivoRetencaoPrazos(): ?string
    {
        $invalidos = [];

        foreach ($this->lista('verificacao-ambiente.prazos_retencao') as $prazo) {
            if (! is_string($prazo)) {
                continue;
            }

            $dias = $this->inteiro("retencao.{$prazo}");

            if ($dias === null || $dias <= 0) {
                $invalidos[] = $prazo;
            }
        }

        return $invalidos === [] ? null : 'Prazo inválido em retencao: '.implode(', ', $invalidos).'.';
    }

    /**
     * @return array<mixed>
     */
    private function lista(string $chave): array
    {
        $valor = config($chave);

        return is_array($valor) ? $valor : [];
    }

    private function inteiro(string $chave): ?int
    {
        $valor = filter_var(config($chave), FILTER_VALIDATE_INT);

        return is_int($valor) ? $valor : null;
    }
}
