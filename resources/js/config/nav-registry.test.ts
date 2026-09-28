import { NAV_REGISTRY } from './nav-registry';
import { PERMISSION_RELATORIOS_RESERVAS_PERIODO } from '@/constants/permissions';
import type { User } from '@/types';

describe('NAV_REGISTRY', () => {
    const baseUser: User = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        email_verified_at: '2026-01-01',
        telefone: '77999999999',
        setor_id: null,
        unread_notifications: [],
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
        roles: [],
        permissions: [],
    };

    it('resolves relatorios href to institucional when user has relatorios.reservas-periodo permission', () => {
        const relatoriosEntry = NAV_REGISTRY.find((entry) => entry.title === 'Relatórios');
        expect(relatoriosEntry).toBeDefined();
        expect(relatoriosEntry?.resolveHref).toBeDefined();

        const institucionalUser: User = {
            ...baseUser,
            permissions: [PERMISSION_RELATORIOS_RESERVAS_PERIODO],
        };

        expect(relatoriosEntry?.resolveHref?.(institucionalUser)).toBe('/institucional/relatorios');
    });

    it('resolves relatorios href to gestor when user does not have relatorios.reservas-periodo permission', () => {
        const relatoriosEntry = NAV_REGISTRY.find((entry) => entry.title === 'Relatórios');
        expect(relatoriosEntry).toBeDefined();
        expect(relatoriosEntry?.resolveHref).toBeDefined();

        const gestorUser: User = {
            ...baseUser,
            permissions: ['secao.relatorios'],
        };

        expect(relatoriosEntry?.resolveHref?.(gestorUser)).toBe('/gestor/relatorios');
    });
});
