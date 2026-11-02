import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import InstituicaoForm from '@/presentation/organisms/InstituicaoForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { type CadastrarInstituicaoForm } from '@/types/admin-forms';
import { Head, useForm } from '@inertiajs/react';
import type React from 'react';
import { useMemo } from 'react';

export type { CadastrarInstituicaoForm };

export default function CadastrarInstituicaoPage() {
    const { t } = useTranslation();

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.instituicoes.titulo'),
                href: route('institucional.instituicoes.index'),
            },
            {
                title: t('admin.instituicoes.cadastrar'),
                href: route('institucional.instituicoes.create'),
            },
        ],
        [t],
    );

    const form = useForm<CadastrarInstituicaoForm>({
        nome: '',
        sigla: '',
        endereco: '',
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        form.post(route('institucional.instituicoes.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.instituicoes.cadastrar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.instituicoes.cadastrar')} descricao={t('admin.instituicoes.cadastrarDesc')} />
                <InstituicaoForm
                    data={form.data}
                    setData={form.setData}
                    submit={submit}
                    errors={form.errors}
                    processing={form.processing}
                    editMode={false}
                />
            </div>
        </AppLayout>
    );
}
