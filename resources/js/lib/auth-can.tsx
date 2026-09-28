import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/auth';
import type { User } from '@/types';
import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

export interface CanProps {
    permission?: string;
    any?: string[];
    all?: string[];
    fallback?: ReactNode;
    children: ReactNode;
}

export function useCan({ permission, any, all }: Omit<CanProps, 'children' | 'fallback'>): boolean {
    const { auth } = usePage<{ auth?: { user?: User | null } }>().props;
    const user = auth?.user;

    if (!user) {
        return false;
    }

    if (permission && !hasPermission(user, permission)) {
        return false;
    }

    if (any && any.length > 0 && !hasAnyPermission(user, any)) {
        return false;
    }

    if (all && all.length > 0 && !hasAllPermissions(user, all)) {
        return false;
    }

    return true;
}

export function Can({ permission, any, all, fallback = null, children }: CanProps) {
    const isAllowed = useCan({ permission, any, all });

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
