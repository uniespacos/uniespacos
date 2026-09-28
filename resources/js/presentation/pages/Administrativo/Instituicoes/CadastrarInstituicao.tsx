import GenericHeader from '@/presentation/molecules/GenericHeader';
import InstituicaoForm from '@/presentation/organisms/InstituicaoForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Head, useForm } from '@inertiajs/react';
import { PlusCircle } from 'lucide-react';
import type React from 'react';

const breadcrumbs = [
    {
        title: 'Gerenciar Instituicão',
        href: '/institucional/instituicoes',
    },
    {
        title: 'Cadastrar Instituicão',
        href: '/institucional/instituicoes/create',
    },
];

export interface CadastrarInstituicaoForm {
    nome: string;
    sigla: string;
    endereco: string;
}

export default function CadastrarInstituicaoPage() {
    const form = useForm({
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
            <Head title="Criar Instituição" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                    <GenericHeader
                        titulo="Cadastrar Instituição"
                        descricao="Preencha os dados abaixo para cadastrar uma nova instituição."
                        buttonText="Cadastrar instituição"
                        buttonLink={route('institucional.instituicoes.create')}
                        ButtonIcon={PlusCircle}
                    />
                    <InstituicaoForm
                        data={form.data}
                        setData={form.setData}
                        submit={submit}
                        errors={form.errors}
                        processing={form.processing}
                        title="Criar Nova Instituição"
                        description="Preencha os dados abaixo para cadastrar uma nova instituição."
                    />
                </div>
            </div>
        </AppLayout>
    );
}
