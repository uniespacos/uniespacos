import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { SyntheticEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import InputError from '@/presentation/atoms/InputError';
import { PasswordInput } from '@/presentation/atoms/PasswordInput';
import AuthLayout from '@/presentation/templates/AuthLayout';

export default function ConfirmPassword() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('password.confirm'), {
            onFinish: () => {
                reset('password');
            },
        });
    };

    return (
        <AuthLayout title={t('auth.confirmPassword.title')} description={t('auth.confirmPassword.subtitle')} maxWidth="md">
            <Head title={t('auth.confirmPassword.head_title')} />

            <div className="flex justify-center sm:justify-start">
                <div className="bg-warning/10 flex size-12 items-center justify-center rounded-xl">
                    <ShieldCheck className="text-warning-accent size-6" />
                </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="password">{t('auth.confirmPassword.password')}</Label>
                    <PasswordInput
                        id="password"
                        name="password"
                        placeholder={t('auth.confirmPassword.password_placeholder')}
                        autoComplete="current-password"
                        value={data.password}
                        autoFocus
                        onChange={(e) => {
                            setData('password', e.target.value);
                        }}
                        hasError={!!errors.password}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'confirm-password-error' : undefined}
                        disabled={processing}
                    />
                    <InputError id="confirm-password-error" message={errors.password} />
                </div>

                <Button type="submit" className="h-11 w-full text-base font-medium" disabled={processing}>
                    {processing ? (
                        <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.confirmPassword.submitting')}
                        </>
                    ) : (
                        t('auth.confirmPassword.submit')
                    )}
                </Button>
            </form>
        </AuthLayout>
    );
}
