import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, MailCheck } from 'lucide-react';
import { SyntheticEvent, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n';
import TextLink from '@/presentation/atoms/TextLink';
import AuthLayout from '@/presentation/templates/AuthLayout';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useTranslation();
    const { post, processing } = useForm({});
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1);
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, [cooldown]);

    const submit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('verification.send'), {
            onSuccess: () => {
                setCooldown(60);
            },
        });
    };

    return (
        <AuthLayout title={t('auth.verifyEmail.title')} description={t('auth.verifyEmail.subtitle')} maxWidth="md">
            <Head title={t('auth.verifyEmail.head_title')} />

            <div className="flex justify-center sm:justify-start">
                <div className="bg-success/10 flex size-12 items-center justify-center rounded-xl">
                    <MailCheck className="text-success-accent size-6" />
                </div>
            </div>

            {status === 'verification-link-sent' && (
                <div
                    role="status"
                    className="bg-success-subtle text-success-accent border-success-accent/30 mb-4 rounded-lg border p-3 text-center text-sm font-medium"
                >
                    {t('auth.verifyEmail.sent_message')}
                </div>
            )}

            <form onSubmit={submit} className="space-y-4">
                <Button disabled={processing || cooldown > 0} className="h-11 w-full text-base font-medium">
                    {processing ? (
                        <>
                            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            {t('auth.verifyEmail.resending')}
                        </>
                    ) : cooldown > 0 ? (
                        t('auth.verifyEmail.resend_cooldown', { seconds: cooldown })
                    ) : (
                        t('auth.verifyEmail.resend_button')
                    )}
                </Button>

                <div className="border-border text-muted-foreground border-t pt-4 text-center text-sm">
                    <TextLink href={route('logout')} method="post" className="text-destructive-accent font-medium hover:underline">
                        {t('auth.verifyEmail.logout_link')}
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
