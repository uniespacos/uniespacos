import AuthSplitLayout from '@/presentation/templates/auth/AuthSplitLayout';
import React from 'react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function AuthLayout({ children, title, description, maxWidth, ...props }: AuthLayoutProps) {
    return (
        <AuthSplitLayout title={title} description={description} maxWidth={maxWidth} {...props}>
            {children}
        </AuthSplitLayout>
    );
}
