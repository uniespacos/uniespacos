import type { NavEntry } from '@/config/nav-registry';
import { User } from '@/types';

/**
 * Verifies if a user has a specific role.
 *
 * @param user - The user object
 * @param role - The role name to check
 * @returns true if the user has the role, false otherwise
 */
export function hasRole(user: User | null | undefined, role: string): boolean {
    if (!user?.roles) {
        return false;
    }

    return user.roles.includes(role);
}

/**
 * Verifies if a user has any of the specified roles.
 *
 * @param user - The user object
 * @param roles - Array of role names to check
 * @returns true if the user has at least one of the roles, false otherwise
 */
export function hasAnyRole(user: User | null | undefined, roles: string[]): boolean {
    if (!user?.roles) {
        return false;
    }

    return roles.some((role) => user.roles.includes(role));
}

/**
 * Verifies if a user has all of the specified roles.
 *
 * @param user - The user object
 * @param roles - Array of role names to check
 * @returns true if the user has all of the roles, false otherwise
 */
export function hasAllRoles(user: User | null | undefined, roles: string[]): boolean {
    if (!user?.roles) {
        return false;
    }

    return roles.every((role) => user.roles.includes(role));
}

/**
 * Verifies if a user has a specific permission.
 *
 * @param user - The user object
 * @param permission - The permission name to check
 * @returns true if the user has the permission, false otherwise
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
    if (!user?.permissions) {
        return false;
    }

    return user.permissions.includes(permission);
}

/**
 * Verifies if a user has any of the specified permissions.
 *
 * @param user - The user object
 * @param permissions - Array of permission names to check
 * @returns true if the user has at least one of the permissions, false otherwise
 */
export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
    if (!user?.permissions) {
        return false;
    }

    return permissions.some((permission) => user.permissions.includes(permission));
}

/**
 * Verifies if a user has all of the specified permissions.
 *
 * @param user - The user object
 * @param permissions - Array of permission names to check
 * @returns true if the user has all of the permissions, false otherwise
 */
export function hasAllPermissions(user: User | null | undefined, permissions: string[]): boolean {
    if (!user?.permissions) {
        return false;
    }

    return permissions.every((permission) => user.permissions.includes(permission));
}

/**
 * Verifica se o usuário atende ao requisito de permissão de uma entrada de
 * navegação: sem `permission` é liberado a todo autenticado; string exige
 * essa permissão; array exige ao menos uma delas.
 */
export function canAccessNavEntry(user: User | null | undefined, entry: Pick<NavEntry, 'permission'>): boolean {
    if (!entry.permission) {
        return true;
    }

    return Array.isArray(entry.permission) ? hasAnyPermission(user, entry.permission) : hasPermission(user, entry.permission);
}
