import { SidebarTrigger } from '@/components/ui/sidebar';
import AppLogoIcon from '@/presentation/atoms/AppLogoIcon';
import { Breadcrumbs } from '@/presentation/molecules/Breadcrumbs';
import { LanguageSelector } from '@/presentation/molecules/LanguageSelector';
import { NotificationDropdown } from '@/presentation/organisms/NotificationDropdown';
import { type BreadcrumbItem as BreadcrumbItemType } from '@/types';
import { Link } from '@inertiajs/react';

export function AppSidebarHeader({ breadcrumbs = [] }: { breadcrumbs?: BreadcrumbItemType[] }) {
    return (
        <header className="border-sidebar-border/50 flex h-16 shrink-0 items-center gap-2 border-b px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <SidebarTrigger className="hidden -ml-1 md:inline-flex" />
                    <Link href="/dashboard" className="flex items-center gap-1.5 md:hidden">
                        <AppLogoIcon className="size-6" />
                        <span className="text-sm font-semibold">UniEspaços</span>
                    </Link>
                    <div className="hidden md:block">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <LanguageSelector />
                    <NotificationDropdown />
                </div>
            </div>
        </header>
    );
}
