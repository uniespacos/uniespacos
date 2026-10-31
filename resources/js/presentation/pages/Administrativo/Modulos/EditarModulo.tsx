import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import ModuloForm from '@/presentation/organisms/ModuloForm';
import AppLayout from '@/presentation/templates/AppLayout';
import { Instituicao, Modulo, Unidade } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { type CadastrarModuloForm } from './CadastrarModulo';
import { validarAndaresModulo } from './validarAndaresModulo';

export default function EditarModulo() {
    const { t } = useTranslation();
    const { instituicao, unidades, modulo } = usePage<{ instituicao: Instituicao; unidades: Unidade[]; modulo: Modulo }>().props;

    const breadcrumbs = useMemo(
        () => [
            {
                title: t('admin.modulos.titulo'),
                href: route('institucional.modulos.index'),
            },
            {
                title: t('admin.modulos.editar'),
                href: route('institucional.modulos.edit', modulo.id),
            },
        ],
        [t, modulo.id],
    );
    const { data, setData, patch, processing, errors } = useForm<CadastrarModuloForm>({
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
        patch(route('institucional.modulos.update', { modulo: modulo.id }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('admin.modulos.editar')} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={t('admin.modulos.editar')} descricao={t('admin.modulos.editarDesc')} />
                <ModuloForm
                    data={data}
                    setData={setData}
                    submit={submit}
                    errors={errors}
                    processing={processing}
                    instituicao={instituicao}
                    unidades={unidades}
                    modulo={modulo}
                />
            </div>
        </AppLayout>
    );
}
