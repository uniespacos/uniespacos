import { ROLE_COMUM, ROLE_GESTOR, ROLE_INSTITUCIONAL } from '@/constants/permissions';
import { SystemRole, type SystemRoleType } from '@/contracts/roles.contract';
import { assertNever, isEnumValue } from '@/lib/utils/exhaustive';
import type { TranslationKey } from '@/i18n/schema';

export * from '@/contracts/roles.contract';

/**
 * Exaustivo por construção: acrescentar um valor a `SystemRole` quebra a compilação aqui.
 */
function rotuloDaRoleCanonica(role: SystemRoleType): string {
    switch (role) {
        case ROLE_INSTITUCIONAL:
            return 'Institucional';
        case ROLE_GESTOR:
            return 'Gestor';
        case ROLE_COMUM:
            return 'Comum';
        default:
            return assertNever(role);
    }
}

function classeDaRoleCanonica(role: SystemRoleType): string {
    switch (role) {
        case ROLE_INSTITUCIONAL:
            return 'bg-destructive-subtle text-destructive-accent border-destructive-accent/30';
        case ROLE_GESTOR:
            return 'bg-info-subtle text-info-accent border-info-accent/30';
        case ROLE_COMUM:
            return 'bg-secondary text-secondary-foreground border-border';
        default:
            return assertNever(role);
    }
}

/**
 * Aceita `string` deliberadamente: `User.roles` traz nomes vindos do backend e o sistema permite
 * criar roles sob demanda (`RoleService::create`), então o valor não é garantidamente canônico.
 * A validação acontece aqui, na fronteira; roles não canônicas caem no fallback.
 */
export function getRoleLabel(roleName: string): string {
    const normalizada = roleName.toLowerCase();

    return isEnumValue(SystemRole, normalizada) ? rotuloDaRoleCanonica(normalizada) : roleName || 'Desconhecido';
}

export function getRoleBadgeClass(roleName: string): string {
    const normalizada = roleName.toLowerCase();

    return isEnumValue(SystemRole, normalizada) ? classeDaRoleCanonica(normalizada) : 'bg-muted text-muted-foreground border-border';
}

/**
 * Converte uma role em sua chave de i18n correspondente. Retorna null se a role não for canônica.
 * Aceita qualquer case (uppercase, lowercase, mixed) e normaliza para lowercase.
 */
export function getRoleLabelKey(roleName: string): TranslationKey | null {
    const normalizada = roleName.toLowerCase();

    if (!isEnumValue(SystemRole, normalizada)) {
        return null;
    }

    switch (normalizada) {
        case ROLE_INSTITUCIONAL:
            return 'usuarios.roles.institucional';
        case ROLE_GESTOR:
            return 'usuarios.roles.gestor';
        case ROLE_COMUM:
            return 'usuarios.roles.comum';
        default:
            return assertNever(normalizada);
    }
}

/**
 * Helper compartilhado para renderizar rótulo traduzido de uma role.
 * Usa getRoleLabelKey para buscar a chave de i18n e a traduz.
 * Se a role não for canônica, retorna getRoleLabel como fallback textual.
 */
export function roleLabel(t: (key: TranslationKey) => string, roleName: string): string {
    const labelKey = getRoleLabelKey(roleName);
    if (labelKey) {
        return t(labelKey);
    }
    return getRoleLabel(roleName);
}
