import { InstallPwaBanner } from '@/presentation/molecules/InstallPwaBanner';
import { AppSidebar } from '@/presentation/organisms/AppSidebar';
import { AppSidebarHeader } from '@/presentation/organisms/AppSidebarHeader';
import { MobileBottomBar } from '@/presentation/organisms/MobileBottomBar';
import { AppContent } from '@/presentation/templates/AppContent';
import { AppShell } from '@/presentation/templates/AppShell';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({ children, breadcrumbs = [] }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
            <MobileBottomBar />
            <InstallPwaBanner />
        </AppShell>
    );
}
