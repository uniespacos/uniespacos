import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { NAV_REGISTRY } from '@/config/nav-registry';
import { useTranslation } from '@/i18n';
import { canAccessNavEntry } from '@/lib/auth';
import AppLogo from '@/presentation/atoms/AppLogo';
import { NavMain } from '@/presentation/molecules/NavMain';
import { NavUser } from '@/presentation/molecules/NavUser';
import type { User } from '@/types';
import { Link, usePage } from '@inertiajs/react';

export function AppSidebar() {
    const { t } = useTranslation();
    const { props } = usePage<{ auth: { user: User } }>();
    const user = props.auth.user;

    const visibleEntries = user ? NAV_REGISTRY.filter((entry) => canAccessNavEntry(user, entry)) : [];

    const commonNav = visibleEntries
        .filter((entry) => entry.group === 'painel')
        .map((entry) => ({
            title: entry.titleKey ? t(entry.titleKey) : entry.title,
            href: entry.href,
            icon: entry.icon,
        }));

    const extraItems = visibleEntries
        .filter((entry) => entry.group === 'gerir')
        .map((entry) => ({
            title: entry.titleKey ? t(entry.titleKey) : entry.title,
            href: entry.resolveHref ? entry.resolveHref(user) : entry.href,
            icon: entry.icon,
        }));

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="border-sidebar-border/50 border-b">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain label={t('nav.group_painel')} items={commonNav} />

                {extraItems.length > 0 && <NavMain label={t('nav.group_gerir')} items={extraItems} />}
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border/50 border-t">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
