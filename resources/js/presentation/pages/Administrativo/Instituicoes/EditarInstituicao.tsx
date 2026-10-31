import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import InstituicaoForm from '@/presentation/organisms/InstituicaoForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao } from '@/types';
import { type CadastrarInstituicaoForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import type React from 'react';
import { useMemo } from 'react';

export type EditarInstituicaoForm = CadastrarInstituicaoForm;

export default function EditarInstituicao() {
    const { t } = useTranslation();
    const { instituicao } = usePage<{ instituicao: Instituicao }>().props;

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.instituicoes.titulo'),
                href: route('institucional.instituicoes.index'),
            },
            {
                title: t('admin.instituicoes.editar'),
                href: route('institucional.instituicoes.edit', instituicao.id),
            },
        ],
        [t, instituicao.id],
    );

    const form = useForm<EditarInstituicaoForm>({
        nome: instituicao.nome,
        sigla: instituicao.sigla,
        endereco: instituicao.endereco ?? '',
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        form.put(route('institucional.instituicoes.update', { instituico: instituicao.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.instituicoes.editar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.instituicoes.editar')} descricao={t('admin.instituicoes.editarDesc')} />
                <InstituicaoForm data={form.data} setData={form.setData} submit={submit} errors={form.errors} processing={form.processing} editMode />
            </div>
        </AppLayout>
    );
}
