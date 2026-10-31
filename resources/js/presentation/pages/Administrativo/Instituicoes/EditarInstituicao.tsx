import InstituicaoForm from '@/presentation/organisms/InstituicaoForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao } from '@/types';
import { type CadastrarInstituicaoForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import type React from 'react';

export type EditarInstituicaoForm = CadastrarInstituicaoForm;

export default function EditarInstituicao() {
    const { instituicao } = usePage<{ instituicao: Instituicao }>().props;
    const breadcrumbs = [
        {
            title: 'Gerenciar Instituições',
            href: '/institucional/instituicoes',
        },
        {
            title: 'Editar Instituição',
            href: `/institucional/instituicoes/${String(instituicao.id)}/edit`,
        },
    ];

    const form = useForm<EditarInstituicaoForm>({
        nome: instituicao.nome,
        sigla: instituicao.sigla,
        endereco: instituicao.endereco,
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        form.put(route('institucional.instituicoes.update', { instituico: instituicao.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${instituicao.nome}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <InstituicaoForm
                    data={form.data}
                    setData={form.setData}
                    submit={submit}
                    errors={form.errors}
                    processing={form.processing}
                    title="Editar Instituição"
                    description="Altere os dados da instituição abaixo."
                />
            </div>
        </AppLayout>
    );
}
