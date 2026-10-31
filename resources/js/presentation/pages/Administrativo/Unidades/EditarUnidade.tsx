import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import UnidadeForm from '@/presentation/organisms/UnidadesForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao, Unidade } from '@/types';
import { type CadastrarUnidadeForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import type React from 'react';
import { useMemo } from 'react';

export type EditarUnidadeForm = CadastrarUnidadeForm;

export default function EditarUnidade() {
    const { t } = useTranslation();
    const { instituicao, unidade } = usePage<{ instituicao: Instituicao; unidade: Unidade }>().props;

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.unidades.titulo'),
                href: route('institucional.unidades.index'),
            },
            {
                title: t('admin.unidades.editar'),
                href: route('institucional.unidades.edit', unidade.id),
            },
        ],
        [t, unidade.id],
    );

    const { data, setData, put, processing, errors } = useForm<EditarUnidadeForm>({
        nome: unidade.nome,
        sigla: unidade.sigla ?? '',
        instituicao_id: unidade.instituicao?.id.toString() ?? '',
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        put(route('institucional.unidades.update', { unidade: unidade.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.unidades.editar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.unidades.editar')} descricao={t('admin.unidades.editarDesc')} />
                <UnidadeForm
                    data={data}
                    setData={setData}
                    submit={submit}
                    errors={errors}
                    processing={processing}
                    instituicao={instituicao}
                    editMode
                />
            </div>
        </AppLayout>
    );
}
