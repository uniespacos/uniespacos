import {
    PERMISSION_SECAO_GESTAO_ESPACOS,
    PERMISSION_SECAO_GESTAO_INSTITUICOES,
    PERMISSION_SECAO_GESTAO_MODULOS,
    PERMISSION_SECAO_GESTAO_RESERVAS,
    PERMISSION_SECAO_GESTAO_ROLES,
    PERMISSION_SECAO_GESTAO_SETORES,
    PERMISSION_SECAO_GESTAO_UNIDADES,
    PERMISSION_SECAO_GESTAO_USUARIOS,
    PERMISSION_SECAO_RELATORIOS,
    PERMISSION_RELATORIOS_RESERVAS_PERIODO,
} from '@/constants/permissions';
import { hasPermission } from '@/lib/auth';
import type { TranslationKey } from '@/i18n';
import type { User } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Briefcase, Building, Calendar, Eye, FileBarChart2, Grid3X3, LayoutGrid, MapPin, School, ShieldCheck, Users } from 'lucide-react';

export type NavGroup = 'painel' | 'gerir';

export interface NavEntry {
    title: string;
    titleKey?: TranslationKey;
    href: string;
    icon: LucideIcon;
    group: NavGroup;
    permission?: string | string[];
    resolveHref?: (user: User) => string;
}

export const NAV_REGISTRY: NavEntry[] = [
    { title: 'Painel Inicial', titleKey: 'nav.dashboard', href: '/dashboard', icon: LayoutGrid, group: 'painel' },
    { title: 'Consultar Espaços', titleKey: 'nav.consultar_espacos', href: '/espacos', icon: Calendar, group: 'painel' },
    { title: 'Minhas Reservas', titleKey: 'nav.minhas_reservas', href: '/reservas', icon: BookOpen, group: 'painel' },

    { title: 'Gerir Reservas', titleKey: 'nav.gerir_reservas', href: '/gestor/reservas', icon: Eye, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_RESERVAS },
    { title: 'Gerir Espaços', titleKey: 'nav.gerir_espacos', href: '/institucional/espacos', icon: Building, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_ESPACOS },
    { title: 'Gerenciar Usuários', titleKey: 'nav.gerenciar_usuarios', href: '/institucional/usuarios', icon: Users, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_USUARIOS },
    { title: 'Gerenciar Papéis', titleKey: 'nav.gerenciar_roles', href: '/institucional/roles', icon: ShieldCheck, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_ROLES },
    {
        title: 'Gerenciar Instituições',
        titleKey: 'nav.gerenciar_instituicoes',
        href: '/institucional/instituicoes',
        icon: School,
        group: 'gerir',
        permission: PERMISSION_SECAO_GESTAO_INSTITUICOES,
    },
    { title: 'Gerenciar Unidades', titleKey: 'nav.gerenciar_unidades', href: '/institucional/unidades', icon: MapPin, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_UNIDADES },
    { title: 'Gerenciar Módulos', titleKey: 'nav.gerenciar_modulos', href: '/institucional/modulos', icon: Grid3X3, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_MODULOS },
    { title: 'Gerenciar Setores', titleKey: 'nav.gerenciar_setores', href: '/institucional/setors', icon: Briefcase, group: 'gerir', permission: PERMISSION_SECAO_GESTAO_SETORES },
    {
        title: 'Relatórios',
        titleKey: 'nav.relatorios',
        href: '/gestor/relatorios',
        icon: FileBarChart2,
        group: 'gerir',
        permission: PERMISSION_SECAO_RELATORIOS,
        resolveHref: (user) => (hasPermission(user, PERMISSION_RELATORIOS_RESERVAS_PERIODO) ? '/institucional/relatorios' : '/gestor/relatorios'),
    },
];
