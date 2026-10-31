import GenericHeader from '@/presentation/molecules/GenericHeader';
import UnidadeForm from '@/presentation/organisms/UnidadesForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao } from '@/types';
import { type CadastrarUnidadeForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import type React from 'react';

export type { CadastrarUnidadeForm };

const breadcrumbs = [
    {
        title: 'Gerenciar Unidades',
        href: '/institucional/unidades',
    },
    {
        title: 'Cadastrar Unidade',
        href: '/institucional/unidades/create',
    },
];

export default function CadastrarUnidadePage() {
    const { instituicao } = usePage<{ instituicao: Instituicao }>().props;
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
            <Head title="Criar Unidade" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo="Cadastrar Unidade" descricao="Preencha os dados abaixo para cadastrar uma nova unidade." />
                <UnidadeForm
                    data={data}
                    setData={setData}
                    submit={submit}
                    errors={errors}
                    processing={processing}
                    title="Criar Nova Unidade"
                    description="Preencha os dados abaixo para cadastrar uma nova unidade."
                    instituicao={instituicao}
                />
            </div>
        </AppLayout>
    );
}
