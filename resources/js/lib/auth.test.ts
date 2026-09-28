import { canAccessNavEntry, hasAllPermissions, hasAllRoles, hasAnyPermission, hasAnyRole, hasPermission, hasRole } from './auth';
import type { User } from '@/types';

describe('auth helper functions', () => {
    const mockUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        email_verified_at: '2026-01-01',
        telefone: '77999999999',
        setor_id: null,
        unread_notifications: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        roles: ['institucional', 'gestor'],
        permissions: ['reservas.listar', 'reservas.avaliar', 'usuarios.listar'],
    };

    describe('hasRole, hasAnyRole, hasAllRoles', () => {
        it('returns false if user is null or undefined or has no roles', () => {
            expect(hasRole(null, 'gestor')).toBe(false);
            expect(hasRole(undefined, 'gestor')).toBe(false);
            expect(hasRole({ ...mockUser, roles: [] }, 'gestor')).toBe(false);

            expect(hasAnyRole(null, ['gestor'])).toBe(false);
            expect(hasAllRoles(null, ['gestor'])).toBe(false);
        });

        it('validates single role correctly', () => {
            expect(hasRole(mockUser, 'gestor')).toBe(true);
            expect(hasRole(mockUser, 'comum')).toBe(false);
        });

        it('validates hasAnyRole correctly', () => {
            expect(hasAnyRole(mockUser, ['comum', 'gestor'])).toBe(true);
            expect(hasAnyRole(mockUser, ['comum', 'visitante'])).toBe(false);
        });

        it('validates hasAllRoles correctly', () => {
            expect(hasAllRoles(mockUser, ['gestor', 'institucional'])).toBe(true);
            expect(hasAllRoles(mockUser, ['gestor', 'comum'])).toBe(false);
        });
    });

    describe('hasPermission, hasAnyPermission, hasAllPermissions', () => {
        it('returns false if user is null or has no permissions', () => {
            expect(hasPermission(null, 'reservas.listar')).toBe(false);
            expect(hasPermission(undefined, 'reservas.listar')).toBe(false);
            expect(hasPermission({ ...mockUser, permissions: [] }, 'reservas.listar')).toBe(false);

            expect(hasAnyPermission(null, ['reservas.listar'])).toBe(false);
            expect(hasAllPermissions(null, ['reservas.listar'])).toBe(false);
        });

        it('validates single permission correctly', () => {
            expect(hasPermission(mockUser, 'reservas.listar')).toBe(true);
            expect(hasPermission(mockUser, 'espacos.criar')).toBe(false);
        });

        it('validates hasAnyPermission correctly', () => {
            expect(hasAnyPermission(mockUser, ['espacos.criar', 'reservas.avaliar'])).toBe(true);
            expect(hasAnyPermission(mockUser, ['espacos.criar', 'espacos.deletar'])).toBe(false);
        });

        it('validates hasAllPermissions correctly', () => {
            expect(hasAllPermissions(mockUser, ['reservas.listar', 'reservas.avaliar'])).toBe(true);
            expect(hasAllPermissions(mockUser, ['reservas.listar', 'espacos.criar'])).toBe(false);
        });
    });

    describe('canAccessNavEntry', () => {
        it('allows access if nav entry has no permission specified', () => {
            expect(canAccessNavEntry(mockUser, {})).toBe(true);
            expect(canAccessNavEntry(null, {})).toBe(true);
        });

        it('evaluates string permission requirement', () => {
            expect(canAccessNavEntry(mockUser, { permission: 'reservas.listar' })).toBe(true);
            expect(canAccessNavEntry(mockUser, { permission: 'espacos.criar' })).toBe(false);
            expect(canAccessNavEntry(null, { permission: 'reservas.listar' })).toBe(false);
        });

        it('evaluates array permission requirement as hasAnyPermission', () => {
            expect(canAccessNavEntry(mockUser, { permission: ['espacos.criar', 'reservas.listar'] })).toBe(true);
            expect(canAccessNavEntry(mockUser, { permission: ['espacos.criar', 'espacos.deletar'] })).toBe(false);
        });
    });
});
