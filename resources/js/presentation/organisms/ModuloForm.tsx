import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SelectContent, SelectItem, SelectTrigger, Select as SelectUI, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/i18n';
import { criarTerreoInicial, garantirTerreo, nivelParaNome } from '@/lib/utils/andars/AndarHelpers';
import { isEditMode, transformModuloToFormData } from '@/lib/utils/andars/ModuloDataFormTransformer';
import { FormField } from '@/presentation/molecules/FormField';
import AndaresManager from '@/presentation/organisms/AndarManager';
import AndarStickFormActions from '@/presentation/organisms/AndarStickFormActions';
import { Instituicao, Modulo, Unidade } from '@/types';
import { type AndarFormData, type CadastrarModuloForm } from '@/types/admin-forms';
import { router, useForm } from '@inertiajs/react';
import type React from 'react';
import { useEffect, useMemo, useRef } from 'react';

export interface ModuloFormProps {
    data: CadastrarModuloForm;
    setData: ReturnType<typeof useForm<CadastrarModuloForm>>['setData'];
    submit: (e: React.SyntheticEvent) => void;
    errors: Record<string, string>;
    processing: boolean;
    instituicao: Instituicao;
    unidades: Unidade[];
    modulo?: Modulo;
}

export default function ModuloForm({ data, setData, submit, errors, processing, instituicao, unidades, modulo }: ModuloFormProps) {
    const { t } = useTranslation();
    const topRef = useRef<HTMLDivElement>(null);
    const andaresRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (modulo && isEditMode(modulo)) {
            const formData = transformModuloToFormData(modulo);
            const andaresComTerreo = garantirTerreo(formData.andares);
            setData({
                ...formData,
                andares: andaresComTerreo.map((andar) => ({ ...andar, nome: nivelParaNome(andar.nivel) })),
            });
        } else {
            setData((prev: CadastrarModuloForm) => (prev.andares.length === 0 ? { ...prev, andares: [criarTerreoInicial()] } : prev));
        }
    }, [modulo, setData]);

    const unidadesFiltradas = useMemo(() => {
        return unidades.filter((unidade) => unidade.instituicao?.id === instituicao.id);
    }, [instituicao.id, unidades]);

    const handleAddAndar = (novoAndar: AndarFormData) => {
        setData((prev: CadastrarModuloForm) => {
            const novosAndares = [...prev.andares, novoAndar];
            return {
                ...prev,
                andares: garantirTerreo(novosAndares),
            };
        });

        setTimeout(() => {
            andaresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const handleUpdateAndar = (andarId: string, andarAtualizado: AndarFormData) => {
        setData((prev: CadastrarModuloForm) => ({
            ...prev,
            andares: prev.andares.map((a: AndarFormData) => (a.id === andarId ? andarAtualizado : a)),
        }));
    };

    const handleRemoveAndar = (andarId: string) => {
        setData((prev: CadastrarModuloForm) => {
            const andarParaRemover = prev.andares.find((a: AndarFormData) => a.id === andarId);

            if (andarParaRemover?.nivel === 0) {
                console.warn('Tentativa de remover térreo bloqueada no handleRemoveAndar');
                return prev;
            }

            const novosAndares = prev.andares.filter((a: AndarFormData) => a.id !== andarId);

            return {
                ...prev,
                andares: garantirTerreo(novosAndares),
            };
        });
    };

    const scrollToTop = () => {
        topRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const editMode = isEditMode(modulo);

    return (
        <div ref={topRef}>
            <form onSubmit={submit} className="space-y-6 pb-20">
                <Card>
                    <CardContent className="space-y-4">
                        {editMode && <div className="text-muted-foreground text-sm">{t('admin.modulos.form.idLabel', { id: modulo?.id ?? '' })}</div>}
                        <FormField label={t('admin.modulos.form.instituicao')} htmlFor="instituicao">
                            <Input id="instituicao" value={instituicao.nome} disabled />
                        </FormField>

                        <FormField label={t('admin.modulos.form.unidade')} htmlFor="unidade_id" error={errors.unidade_id} required>
                            <SelectUI
                                value={data.unidade_id}
                                onValueChange={(value) => {
                                    setData((prev: CadastrarModuloForm) => ({ ...prev, unidade_id: value }));
                                }}
                                disabled={processing}
                            >
                                <SelectTrigger id="unidade_id">
                                    <SelectValue placeholder={t('admin.modulos.form.selecioneUnidade')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {unidadesFiltradas.map((unidade) => (
                                        <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                            {unidade.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectUI>
                        </FormField>

                        <FormField label={t('admin.modulos.form.nome')} htmlFor="nome" error={errors.nome} required>
                            <Input
                                id="nome"
                                value={data.nome}
                                onChange={(e) => {
                                    setData((prev: CadastrarModuloForm) => ({ ...prev, nome: e.target.value }));
                                }}
                                placeholder={t('admin.modulos.form.nomePlaceholder')}
                                disabled={processing}
                            />
                        </FormField>
                    </CardContent>
                </Card>

                <Card ref={andaresRef}>
                    <CardHeader>
                        <CardTitle>{t('admin.modulos.form.andaresTitulo')}</CardTitle>
                        <CardDescription>{t('admin.modulos.form.andaresDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <AndaresManager
                            andares={data.andares}
                            onUpdate={handleUpdateAndar}
                            onRemove={handleRemoveAndar}
                            onAdd={handleAddAndar}
                            errors={errors}
                            processing={processing}
                        />
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            router.get(route('institucional.modulos.index'));
                        }}
                        disabled={processing}
                    >
                        {t('common.actions.cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                        {processing ? t('common.actions.saving') : editMode ? t('common.actions.update') : t('common.actions.save')}
                    </Button>
                </div>
            </form>

            <AndarStickFormActions processing={processing} isEditMode={editMode} onScrollToTop={scrollToTop} andaresCount={data.andares.length} />
        </div>
    );
}
