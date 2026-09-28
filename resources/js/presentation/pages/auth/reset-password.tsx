import { Head, Link, useForm } from '@inertiajs/react';
import { KeyRound, LoaderCircle } from 'lucide-react';
import { SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import InputError from '@/presentation/atoms/InputError';
import { PasswordInput } from '@/presentation/atoms/PasswordInput';
import { PasswordStrengthMeter } from '@/presentation/molecules/PasswordStrengthMeter';
import AuthLayout from '@/presentation/templates/AuthLayout';

interface ResetPasswordProps {
    token: string;
    email: string;
}

interface ResetPasswordForm {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm<Required<ResetPasswordForm>>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('password.update'), {
            onFinish: () => {
                reset('password', 'password_confirmation');
            },
        });
    };

    return (
        <AuthLayout title={t('auth.resetPassword.title')} description={t('auth.resetPassword.subtitle')} maxWidth="md">
            <Head title={t('auth.resetPassword.head_title')} />

            <div className="flex justify-center sm:justify-start">
                <div className="bg-primary/10 flex size-12 items-center justify-center rounded-xl">
                    <KeyRound className="text-primary size-6" />
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.resetPassword.email')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={data.email}
                        readOnly
                        disabled
                        className="bg-muted text-muted-foreground"
                    />
                    <InputError id="reset-email-error" message={errors.email} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.resetPassword.password')}</Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        value={data.password}
                        autoFocus
                        onChange={(e) => {
                            setData('password', e.target.value);
                        }}
                        placeholder={t('auth.resetPassword.password_placeholder')}
                        hasError={!!errors.password}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'reset-password-error' : undefined}
                        disabled={processing}
                    />
                    <InputError id="reset-password-error" message={errors.password} />
                    <PasswordStrengthMeter password={data.password} className="mt-2" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password_confirmation">{t('auth.resetPassword.password_confirmation')}</Label>
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => {
                            setData('password_confirmation', e.target.value);
                        }}
                        placeholder={t('auth.resetPassword.password_confirmation_placeholder')}
                        hasError={!!errors.password_confirmation}
                        aria-invalid={!!errors.password_confirmation}
                        aria-describedby={errors.password_confirmation ? 'reset-confirm-error' : undefined}
                        disabled={processing}
                    />
                    <InputError id="reset-confirm-error" message={errors.password_confirmation} />
                </div>

                <Button type="submit" className="h-11 w-full text-base font-medium" disabled={processing}>
                    {processing ? (
                        <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.resetPassword.submitting')}
                        </>
                    ) : (
                        t('auth.resetPassword.submit')
                    )}
                </Button>

                <div className="border-border text-muted-foreground border-t pt-4 text-center text-sm">
                    {t('auth.resetPassword.remembered_password')}{' '}
                    <Link href={route('login')} className="text-primary font-medium underline-offset-4 hover:underline">
                        {t('auth.resetPassword.back_to_login')}
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
