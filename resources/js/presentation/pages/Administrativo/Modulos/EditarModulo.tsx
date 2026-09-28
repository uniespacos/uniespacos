import { validarEstrutura } from '@/lib/utils/andars/AndarHelpers';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import ModuloForm from '@/presentation/organisms/ModuloForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao, Modulo, Unidade } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { CadastrarModuloForm } from './CadastrarModulo';

export default function EditarModulo() {
    const { instituicao, unidades, modulo } = usePage<{ instituicao: Instituicao; unidades: Unidade[]; modulo: Modulo }>().props;
    const breadcrumbs = [
        {
            title: 'Gerenciar Modulos',
            href: '/institucional/modulo',
        },
        {
            title: 'Editar Modulo',
            href: `/institucional/modulos/${modulo.id.toString()}/edit`,
        },
    ];
    const { data, setData, patch, processing, errors } = useForm<CadastrarModuloForm>({
        nome: '',
        unidade_id: '',
        andares: [],
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        const validacaoEstrutura = validarEstrutura(data.andares);
        if (!validacaoEstrutura.valido) {
            toast.error(`Estrutura inválida: ${validacaoEstrutura.erros.join(', ')}`);
            return;
        }
        let hasAcessoError = false;
        data.andares.forEach((andar) => {
            if (andar.tipo_acesso.length === 0) {
                hasAcessoError = true;
            }
        });
        if (hasAcessoError) {
            toast.error('Todos os andares devem ter pelo menos um tipo de acesso definido.');
            return;
        }
        patch(route('institucional.modulos.update', { modulo: modulo.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Criar Modulo" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                    <GenericHeader titulo="Cadastrar Modulo" descricao="Preencha os dados abaixo para cadastrar um novo modulo." />
                    <ModuloForm
                        data={data}
                        setData={setData}
                        submit={submit}
                        errors={errors}
                        processing={processing}
                        title="Criar Novo Módulo"
                        description="Preencha os dados abaixo para cadastrar um novo modulo."
                        instituicao={instituicao}
                        unidades={unidades}
                        modulo={modulo}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
