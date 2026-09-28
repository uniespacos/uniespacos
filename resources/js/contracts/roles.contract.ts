export const SystemRole = {
    INSTITUCIONAL: 'institucional',
    GESTOR: 'gestor',
    COMUM: 'comum',
} as const;

export type SystemRoleType = (typeof SystemRole)[keyof typeof SystemRole];
export type RoleType = SystemRoleType;

export const ROLES_VALIDAS: readonly RoleType[] = [SystemRole.INSTITUCIONAL, SystemRole.GESTOR, SystemRole.COMUM] as const;
