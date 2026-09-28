import GenericHeader from '@/presentation/molecules/GenericHeader';
import UnidadeForm from '@/presentation/organisms/UnidadesForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao, Unidade } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';

export interface EditarUnidadeForm {
    nome: string;
    sigla: string;
    instituicao_id: string;
    [key: string]: string;
}

export default function EditarUnidade() {
    const { instituicao, unidade } = usePage<{ instituicao: Instituicao; unidade: Unidade }>().props;
    const breadcrumbs = [
        {
            title: 'Gerenciar Unidades',
            href: '/institucional/unidades',
        },
        {
            title: 'Editar Unidade',
            href: `/institucional/unidades/${unidade.id}/edit`,
        },
    ];
    const { data, setData, put, processing, errors } = useForm<EditarUnidadeForm>({
        nome: unidade.nome,
        sigla: unidade.sigla,
        instituicao_id: unidade.instituicao?.id.toString() || '',
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        put(route('institucional.unidades.update', { unidade: unidade.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${unidade.nome}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                    <GenericHeader titulo={`Editar Unidade:  ${unidade.nome}`} descricao="Aqui você consegue editar a unidade selecionada" />
                    <UnidadeForm
                        data={data}
                        setData={setData}
                        submit={submit}
                        errors={errors}
                        processing={processing}
                        title="Editar Modulo"
                        description="Altere os dados do modulo abaixo."
                        instituicao={instituicao}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
