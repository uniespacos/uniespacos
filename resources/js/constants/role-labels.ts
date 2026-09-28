import { ROLE_COMUM, ROLE_GESTOR, ROLE_INSTITUCIONAL } from '@/constants/permissions';
import { SystemRole, type SystemRoleType } from '@/contracts/roles.contract';
import { assertNever, isEnumValue } from '@/lib/utils/exhaustive';

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
