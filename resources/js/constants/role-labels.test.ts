import { getRoleBadgeClass, getRoleLabel, getRoleLabelKey } from './role-labels';
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

    describe('getRoleLabelKey', () => {
        it('getRoleLabelKey_gestor_retorna_chave_i18n', () => {
            expect(getRoleLabelKey(ROLE_GESTOR)).toBe('usuarios.roles.gestor');
            expect(getRoleLabelKey('GESTOR')).toBe('usuarios.roles.gestor');
            expect(getRoleLabelKey('Gestor')).toBe('usuarios.roles.gestor');
        });

        it('getRoleLabelKey_institucional_retorna_chave_i18n', () => {
            expect(getRoleLabelKey(ROLE_INSTITUCIONAL)).toBe('usuarios.roles.institucional');
            expect(getRoleLabelKey('INSTITUCIONAL')).toBe('usuarios.roles.institucional');
        });

        it('getRoleLabelKey_comum_retorna_chave_i18n', () => {
            expect(getRoleLabelKey(ROLE_COMUM)).toBe('usuarios.roles.comum');
            expect(getRoleLabelKey('COMUM')).toBe('usuarios.roles.comum');
        });

        it('getRoleLabelKey_role_nao_canonica_retorna_null', () => {
            expect(getRoleLabelKey('coordenador')).toBeNull();
            expect(getRoleLabelKey('')).toBeNull();
            expect(getRoleLabelKey('visitante')).toBeNull();
        });
    });
});
