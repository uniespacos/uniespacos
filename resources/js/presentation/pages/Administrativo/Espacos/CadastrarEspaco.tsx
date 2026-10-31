import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/i18n';
import { resolveStorageUrl } from '@/lib/storage-url';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import { ImageUpload, ImageWithPreview } from '@/presentation/molecules/ImageUpload';
import { LocationSelector } from '@/presentation/molecules/LocationSelector';
import { EspacoFormFields } from '@/presentation/organisms/EspacoFormFields';
import AppLayout from '@/presentation/templates/AppLayout';
import { Andar, Espaco, Modulo, Unidade } from '@/types';
import { type FormCadastroValues } from '@/types/admin-forms';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

export type { FormCadastroValues };

export default function CadastrarEspacoPage() {
    const { t } = useTranslation();
    const { unidades, modulos, andares, espaco } = usePage<{
        unidades: Unidade[];
        modulos: Modulo[];
        andares: Andar[];
        espaco?: Espaco & {
            andar: Andar & { modulo: Modulo & { unidade: Unidade } };
        };
    }>().props;
    const isEditMode = !!espaco;

    const breadcrumbs = useMemo(
        () => [
            { title: t('admin.espacos.titulo'), href: route('institucional.espacos.index') },
            { title: t('admin.espacos.cadastrar'), href: route('institucional.espacos.create') },
        ],
        [t],
    );

    const [imagesWithPreviews, setImagesWithPreviews] = useState<ImageWithPreview[]>(() => {
        if (!isEditMode || !espaco.imagens) return [];
        return espaco.imagens.map((imgPath) => ({
            file: new File([], imgPath, { type: 'image/*' }),
            preview: resolveStorageUrl(imgPath) ?? '',
            path: imgPath,
        }));
    });

    const { data, setData, post, patch, processing, errors, reset } = useForm<FormCadastroValues>({
        nome: espaco?.nome ?? '',
        capacidade_pessoas: espaco?.capacidade_pessoas ?? undefined,
        descricao: espaco?.descricao ?? '',
        imagens: [],
        main_image_index: espaco?.imagens ? espaco.imagens.findIndex((img) => img === espaco.main_image_index) : 0,
        unidade_id: espaco?.andar.modulo.unidade.id ?? undefined,
        modulo_id: espaco?.andar.modulo.id ?? undefined,
        andar_id: espaco?.andar.id ?? undefined,
    });

    const handleSetMainImage = (index: number) => {
        setData((prevData) => ({ ...prevData, main_image_index: index }));
    };
    const handleImagesToDelete = (path: string) => {
        setData((prevData) => ({ ...prevData, images_to_delete: [...(data.images_to_delete ?? []), path] }));
    };

    const onSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (isEditMode) {
            patch(route('institucional.espacos.update', espaco.id), {
                onSuccess: () => {
                    toast.success(t('admin.espacos.toast.atualizado'));
                    if (!isEditMode) {
                        reset();
                        setImagesWithPreviews([]);
                    }
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || t('admin.espacos.toast.erroValidacao'));
                },
            });
        } else {
            post(route('institucional.espacos.store'), {
                forceFormData: true,
                onSuccess: () => {
                    toast.success(t('admin.espacos.toast.cadastrado'));
                    if (!isEditMode) {
                        reset();
                        setImagesWithPreviews([]);
                    }
                },
                onError: (errs) => {
                    toast.error(Object.values(errs)[0] || t('admin.espacos.toast.erroValidacao'));
                },
            });
        }
    };
    const pageTitulo = isEditMode ? t('admin.espacos.editar') : t('admin.espacos.cadastrar');
    const pageDescricao = isEditMode ? t('admin.espacos.editarDesc') : t('admin.espacos.cadastrarDesc');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={pageTitulo} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4 md:p-6">
                <GenericHeader titulo={pageTitulo} descricao={pageDescricao} />
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <form onSubmit={onSubmit} className="space-y-6">
                            <LocationSelector
                                unidades={unidades}
                                modulos={modulos}
                                andares={andares}
                                unidadeSelecionada={data.unidade_id}
                                setUnidadeSelecionada={(unidadeSelecionada) => {
                                    setData((prevData) => ({ ...prevData, unidade_id: unidadeSelecionada }));
                                }}
                                moduloSelecionado={data.modulo_id}
                                handleModuloChange={(moduloSelecionado) => {
                                    setData((prevData) => ({ ...prevData, modulo_id: moduloSelecionado }));
                                }}
                                andarSelecionado={data.andar_id}
                                handleAndarChange={(andarSelecionado) => {
                                    setData((prevData) => ({ ...prevData, andar_id: parseInt(andarSelecionado!, 10) }));
                                }}
                                processing={processing}
                                errors={errors}
                            />
                            <EspacoFormFields data={data} setData={setData} errors={errors} processing={processing} />
                            <ImageUpload
                                imagesWithPreviews={imagesWithPreviews}
                                setImagesWithPreviews={setImagesWithPreviews}
                                mainImageIndex={data.main_image_index}
                                setMainImageIndex={handleSetMainImage}
                                setData={setData}
                                setImagesToDelete={handleImagesToDelete}
                                processing={processing}
                                errors={errors}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        router.get(route('institucional.espacos.index'));
                                    }}
                                    disabled={processing}
                                >
                                    {t('common.actions.cancel')}
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {processing ? t('common.actions.saving') : isEditMode ? t('common.actions.update') : t('common.actions.save')}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
