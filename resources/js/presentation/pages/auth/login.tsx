import { Head, Link, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { SyntheticEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import InputError from '@/presentation/atoms/InputError';
import { PasswordInput } from '@/presentation/atoms/PasswordInput';
import TextLink from '@/presentation/atoms/TextLink';
import AuthLayout from '@/presentation/templates/AuthLayout';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword?: boolean;
}

export default function Login({ status, canResetPassword = true }: LoginProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });
    const [clientEmailError, setClientEmailError] = useState<string | null>(null);

    const handleEmailBlur = () => {
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            setClientEmailError(t('auth.login.email_invalid'));
        } else {
            setClientEmailError(null);
        }
    };

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => {
                reset('password');
            },
        });
    };

    const emailError = errors.email ?? clientEmailError ?? undefined;

    return (
        <AuthLayout title={t('auth.login.header_title')} description={t('auth.login.header_desc')} maxWidth="md">
            <Head title={t('auth.login.head_title')} />

            {status && (
                <div
                    role="status"
                    className="bg-success-subtle text-success-accent border-success-accent/30 rounded-lg border p-3 text-center text-sm font-medium"
                >
                    {status}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.login.email_institutional')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="username"
                        placeholder={t('auth.login.email_placeholder')}
                        value={data.email}
                        autoFocus
                        onBlur={handleEmailBlur}
                        onChange={(e) => {
                            setData('email', e.target.value);
                            if (clientEmailError) setClientEmailError(null);
                        }}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? 'email-error' : undefined}
                        className={emailError ? 'border-destructive focus-visible:ring-destructive' : ''}
                        disabled={processing}
                    />
                    <InputError id="email-error" message={emailError} />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('auth.login.password_label')}</Label>
                        {canResetPassword && (
                            <TextLink href={route('password.request')} className="text-muted-foreground hover:text-primary text-xs">
                                {t('auth.login.forgotPassword')}
                            </TextLink>
                        )}
                    </div>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="current-password"
                        placeholder={t('auth.login.password_placeholder')}
                        value={data.password}
                        onChange={(e) => {
                            setData('password', e.target.value);
                        }}
                        hasError={!!errors.password}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                        disabled={processing}
                    />
                    <InputError id="password-error" message={errors.password} />
                </div>

                <div className="flex items-center space-x-2 py-1">
                    <Checkbox
                        id="remember"
                        checked={data.remember}
                        onCheckedChange={(checked) => {
                            setData('remember', !!checked);
                        }}
                        disabled={processing}
                    />
                    <Label htmlFor="remember" className="text-muted-foreground cursor-pointer text-sm font-normal select-none">
                        {t('auth.login.remember_device')}
                    </Label>
                </div>

                <Button type="submit" className="h-11 w-full text-base font-medium" disabled={processing}>
                    {processing ? (
                        <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.login.entering')}
                        </>
                    ) : (
                        t('auth.login.submit_system')
                    )}
                </Button>

                <div className="border-border text-muted-foreground border-t pt-4 text-center text-sm">
                    {t('auth.login.no_account_text')}{' '}
                    <Link href={route('register')} className="text-primary font-medium underline-offset-4 hover:underline">
                        {t('auth.login.create_account')}
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
