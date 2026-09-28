import { FormRegistroUsuario } from '@/presentation/organisms/FormRegistroUsuario';
import AuthLayout from '@/presentation/templates/AuthLayout';
import { Instituicao } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type React from 'react';
import { useTranslation } from '@/i18n';

export default function Register() {
    const { t } = useTranslation();
    const { instituicaos } = usePage<{ instituicaos: Instituicao[] }>().props;

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        password_confirmation: '',
        campus: '',
        instituicao_id: '',
        setor_id: '',
    });

    const handleInputChange = (field: string, value: string) => {
        setData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => {
                reset('password', 'password_confirmation');
            },
        });
    };

    return (
        <AuthLayout title={t('auth.register.header_title')} description={t('auth.register.header_desc')} maxWidth="2xl">
            <Head title={t('auth.register.head_title')} />

            <FormRegistroUsuario
                data={data}
                onInputChange={handleInputChange}
                errors={errors}
                processing={processing}
                instituicaos={instituicaos}
                onSubmit={handleSubmit}
            />

            <div className="border-border text-muted-foreground border-t pt-4 text-center text-sm">
                {t('auth.register.has_account_text')}{' '}
                <Link href={route('login')} className="text-primary font-medium underline-offset-4 hover:underline">
                    {t('auth.register.do_login')}
                </Link>
            </div>
        </AuthLayout>
    );
}
