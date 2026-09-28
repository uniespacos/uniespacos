import { getRoleBadgeClass, getRoleLabel } from './role-labels';
import { ROLE_COMUM, ROLE_GESTOR, ROLE_INSTITUCIONAL } from './permissions';

describe('role-labels', () => {
    describe('getRoleLabel', () => {
        it('returns proper labels for canonical roles', () => {
            expect(getRoleLabel(ROLE_INSTITUCIONAL)).toBe('Institucional');
            expect(getRoleLabel(ROLE_GESTOR)).toBe('Gestor');
            expect(getRoleLabel(ROLE_COMUM)).toBe('Comum');
        });

        it('returns fallback for unknown roles or empty string', () => {
            expect(getRoleLabel('visitante')).toBe('visitante');
            expect(getRoleLabel('')).toBe('Desconhecido');
        });

        it('não lança para roles customizadas criadas em runtime', () => {
            // O sistema permite criar roles sob demanda (RoleService::create), então nomes fora do
            // contrato são legítimos e devem degradar com elegância, nunca derrubar a tela.
            expect(() => getRoleLabel('coordenador')).not.toThrow();
            expect(getRoleLabel('coordenador')).toBe('coordenador');
            expect(() => getRoleBadgeClass('coordenador')).not.toThrow();
            expect(getRoleBadgeClass('coordenador')).toContain('text-muted-foreground');
        });
    });

    describe('getRoleBadgeClass', () => {
        it('returns theme tokens for canonical roles', () => {
            expect(getRoleBadgeClass(ROLE_INSTITUCIONAL)).toContain('text-destructive-accent');
            expect(getRoleBadgeClass(ROLE_GESTOR)).toContain('text-info-accent');
            expect(getRoleBadgeClass(ROLE_COMUM)).toContain('text-secondary-foreground');
            expect(getRoleBadgeClass('outro')).toContain('text-muted-foreground');
        });
    });
});
