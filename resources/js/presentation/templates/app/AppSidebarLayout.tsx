import { usePrivacidadeHabilitada } from '@/hooks/use-privacidade-habilitada';
import { InstallPwaBanner } from '@/presentation/molecules/InstallPwaBanner';
import { PrivacyLink } from '@/presentation/molecules/PrivacyLink';
import { AppSidebar } from '@/presentation/organisms/AppSidebar';
import { AppSidebarHeader } from '@/presentation/organisms/AppSidebarHeader';
import { MobileBottomBar } from '@/presentation/organisms/MobileBottomBar';
import { AppContent } from '@/presentation/templates/AppContent';
import { AppShell } from '@/presentation/templates/AppShell';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const privacidadeHabilitada = usePrivacidadeHabilitada();

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
                {privacidadeHabilitada && (
                    <footer className="text-muted-foreground px-4 pt-2 text-center text-xs">
                        <PrivacyLink />
                    </footer>
                )}
            </AppContent>
            <MobileBottomBar />
            <InstallPwaBanner />
        </AppShell>
    );
}
