/**
 * Registry singleton para canais Echo com reference-counting.
 *
 * Centraliza a obtenção/liberação de canais Echo (público e privado), garantindo que:
 * - Múltiplos consumidores podem assinar o mesmo canal sem duplicação
 * - O canal só é efetivamente "left" quando o último consumidor desmonta
 * - Não há colisão entre Echo.leave() de um consumidor derrubando listeners de outros
 */

// Tipos derivados diretamente de Window['Echo'] (parametrizado como Echo<'reverb'> em global.d.ts)
type EchoInstance = Window['Echo'];
export type EchoPublicChannel = ReturnType<EchoInstance['channel']>;
export type EchoPrivateChannel = ReturnType<EchoInstance['private']>;

interface ChannelRef<T> {
    channel: T;
    refCount: number;
}

// Maps internos para rastreamento de referência
const publicChannels = new Map<string, ChannelRef<EchoPublicChannel>>();
const privateChannels = new Map<string, ChannelRef<EchoPrivateChannel>>();

// Helpers para acessar Echo de forma type-safe
// Cast é necessário apenas para cobrir runtime onde Echo pode estar ausente antes de app.tsx rodar
function getEchoInstance(): EchoInstance | undefined {
    return window.Echo;
}

/**
 * Adquire uma referência a um canal público Echo.
 * Se já existe, incrementa o refCount e devolve a instância cacheada.
 * Se não existe, cria uma nova e armazena com refCount = 1.
 * Se window.Echo não existir, retorna undefined.
 */
export function acquirePublicChannel(name: string): EchoPublicChannel | undefined {
    const echo = getEchoInstance();
    if (!echo) {
        return undefined;
    }

    const existing = publicChannels.get(name);
    if (existing) {
        existing.refCount += 1;
        return existing.channel;
    }

    const channel = echo.channel(name);
    publicChannels.set(name, { channel, refCount: 1 });
    return channel;
}

/**
 * Libera uma referência a um canal público Echo.
 * Decrementa o refCount; se chegar a 0, chama window.Echo.leave(name) e remove do registro.
 * Se o canal não existe no registry, é um no-op.
 */
export function releasePublicChannel(name: string): void {
    const existing = publicChannels.get(name);
    if (!existing) {
        return;
    }

    existing.refCount -= 1;
    if (existing.refCount <= 0) {
        const echo = getEchoInstance();
        if (echo) {
            echo.leave(name);
        }
        publicChannels.delete(name);
    }
}

/**
 * Adquire uma referência a um canal privado Echo.
 * Se já existe, incrementa o refCount e devolve a instância cacheada.
 * Se não existe, cria uma nova e armazena com refCount = 1.
 * Se window.Echo não existir, retorna undefined.
 */
export function acquirePrivateChannel(name: string): EchoPrivateChannel | undefined {
    const echo = getEchoInstance();
    if (!echo) {
        return undefined;
    }

    const existing = privateChannels.get(name);
    if (existing) {
        existing.refCount += 1;
        return existing.channel;
    }

    const channel = echo.private(name);
    privateChannels.set(name, { channel, refCount: 1 });
    return channel;
}

/**
 * Libera uma referência a um canal privado Echo.
 * Decrementa o refCount; se chegar a 0, chama window.Echo.leave(name) e remove do registro.
 * Se o canal não existe no registry, é um no-op.
 */
export function releasePrivateChannel(name: string): void {
    const existing = privateChannels.get(name);
    if (!existing) {
        return;
    }

    existing.refCount -= 1;
    if (existing.refCount <= 0) {
        const echo = getEchoInstance();
        if (echo) {
            echo.leave(name);
        }
        privateChannels.delete(name);
    }
}

/**
 * Reseta o estado interno do registry (limpa os dois Maps).
 * APENAS para uso em testes — isola estado entre testes.
 */
export function __resetEchoChannelRegistryForTests(): void {
    publicChannels.clear();
    privateChannels.clear();
}

/**
 * Reconecta a conexão Pusher/Reverb se a aba voltar a ficar visível e a conexão estiver inativa/fechada.
 */
export function handleEchoVisibilityChange(): void {
    if (typeof document === 'undefined') {
        return;
    }

    if (document.visibilityState === 'visible') {
        const echoConnector = (
            window as unknown as {
                Echo?: {
                    connector?: {
                        pusher?: {
                            connection?: {
                                isOpen: () => boolean;
                            };
                            connect: () => void;
                        };
                    };
                };
            }
        ).Echo?.connector;

        if (echoConnector?.pusher?.connection && !echoConnector.pusher.connection.isOpen()) {
            echoConnector.pusher.connect();
        }
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleEchoVisibilityChange);
}
