import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import ModuloForm from '@/presentation/organisms/ModuloForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao, Unidade } from '@/types';
import { type AndarFormData, type CadastrarModuloForm } from '@/types/admin-forms';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { validarAndaresModulo } from './validarAndaresModulo';

export type { AndarFormData, CadastrarModuloForm };

export default function CadastrarModuloPage() {
    const { t } = useTranslation();
    const { instituicao, unidades } = usePage<{ instituicao: Instituicao; unidades: Unidade[] }>().props;

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.modulos.titulo'),
                href: route('institucional.modulos.index'),
            },
            {
                title: t('admin.modulos.cadastrar'),
                href: route('institucional.modulos.create'),
            },
        ],
        [t],
    );

    const { data, setData, post, processing, errors } = useForm<CadastrarModuloForm>({
        nome: '',
        unidade_id: '',
        andares: [],
    });

    const submit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        const erro = validarAndaresModulo(data.andares, t);
        if (erro) {
            toast.error(erro);
            return;
        }
        post(route('institucional.modulos.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.modulos.cadastrar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.modulos.cadastrar')} descricao={t('admin.modulos.cadastrarDesc')} />
                <ModuloForm
                    data={data}
                    setData={setData}
                    submit={submit}
                    errors={errors}
                    processing={processing}
                    instituicao={instituicao}
                    unidades={unidades}
                />
            </div>
        </AppLayout>
    );
}
