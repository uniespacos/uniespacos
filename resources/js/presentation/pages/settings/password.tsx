import InputError from '@/presentation/atoms/InputError';
import AppLayout from '@/presentation/templates/AppLayout';
import SettingsLayout from '@/presentation/templates/settings/Layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { SyntheticEvent, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import HeadingSmall from '@/presentation/atoms/HeadingSmall';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configurações de Senha',
        href: '/settings/password',
    },
];

export default function Password() {
    const { t } = useTranslation();
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword = (e: SyntheticEvent) => {
        e.preventDefault();

        put(route('settings.password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
            },
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('settings.password.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title={t('settings.password.title')}
                        description={t('settings.password.desc')}
                    />

                    <form onSubmit={updatePassword} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="current_password">{t('settings.password.current')}</Label>

                            <Input
                                id="current_password"
                                ref={currentPasswordInput}
                                value={data.current_password}
                                onChange={(e) => {
                                    setData('current_password', e.target.value);
                                }}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="current-password"
                                placeholder={t('settings.password.current_placeholder')}
                            />

                            <InputError message={errors.current_password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">{t('settings.password.new')}</Label>

                            <Input
                                id="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => {
                                    setData('password', e.target.value);
                                }}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder={t('settings.password.new_placeholder')}
                            />

                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">{t('settings.password.confirm')}</Label>

                            <Input
                                id="password_confirmation"
                                value={data.password_confirmation}
                                onChange={(e) => {
                                    setData('password_confirmation', e.target.value);
                                }}
                                type="password"
                                className="mt-1 block w-full"
                                autoComplete="new-password"
                                placeholder={t('settings.password.confirm_placeholder')}
                            />

                            <InputError message={errors.password_confirmation} />
                        </div>

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>{t('settings.password.submit')}</Button>

                            {recentlySuccessful && <p className="text-muted-foreground text-sm">{t('settings.password.saved')}</p>}
                        </div>
                    </form>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
