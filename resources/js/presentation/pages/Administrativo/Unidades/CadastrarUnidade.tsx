import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import UnidadeForm from '@/presentation/organisms/UnidadesForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao } from '@/types';
import { type CadastrarUnidadeForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import type React from 'react';
import { useMemo } from 'react';

export type { CadastrarUnidadeForm };

export default function CadastrarUnidadePage() {
    const { t } = useTranslation();
    const { instituicao } = usePage<{ instituicao: Instituicao }>().props;

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.unidades.titulo'),
                href: route('institucional.unidades.index'),
            },
            {
                title: t('admin.unidades.cadastrar'),
                href: route('institucional.unidades.create'),
            },
        ],
        [t],
    );

    const { data, setData, post, processing, errors } = useForm<CadastrarUnidadeForm>({
        nome: '',
        sigla: '',
        instituicao_id: instituicao.id.toString(),
    });

    const submit = (e: React.SyntheticEvent) => {
        setData((prevData) => ({ ...prevData, instituicao_id: instituicao.id.toString() }));

        e.preventDefault();

        post(route('institucional.unidades.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.unidades.cadastrar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.unidades.cadastrar')} descricao={t('admin.unidades.cadastrarDesc')} />
                <UnidadeForm
                    data={data}
                    setData={setData}
                    submit={submit}
                    errors={errors}
                    processing={processing}
                    instituicao={instituicao}
                    editMode={false}
                />
            </div>
        </AppLayout>
    );
}
