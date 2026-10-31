import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import { FormField } from '@/presentation/molecules/FormField';
import { Instituicao } from '@/types';
import { type CadastrarUnidadeForm } from '@/types/admin-forms';
import { router, useForm } from '@inertiajs/react';
import type React from 'react';
import { useEffect } from 'react';

interface UnidadeFormProps {
    data: CadastrarUnidadeForm;
    setData: ReturnType<typeof useForm<CadastrarUnidadeForm>>['setData'];
    submit: (e: React.SyntheticEvent) => void;
    errors: Record<string, string>;
    processing: boolean;
    instituicao: Instituicao;
    editMode: boolean;
}

export default function UnidadeForm({ data, setData, submit, errors, processing, instituicao, editMode }: UnidadeFormProps) {
    const { t } = useTranslation();

    useEffect(() => {
        setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, instituicao_id: instituicao.id.toString() }));
    }, [instituicao, setData]);

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                <CardContent className="space-y-4">
                    <FormField label={t('admin.unidades.form.instituicao')} htmlFor="instituicao">
                        <Input id="instituicao" value={instituicao.nome} disabled />
                    </FormField>

                    <FormField label={t('admin.unidades.form.nome')} htmlFor="nome" error={errors.nome} required>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => {
                                setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, nome: e.target.value }));
                            }}
                            placeholder={t('admin.unidades.form.nomePlaceholder')}
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label={t('admin.unidades.form.sigla')} htmlFor="sigla" error={errors.sigla} required>
                        <Input
                            id="sigla"
                            value={data.sigla}
                            onChange={(e) => {
                                setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, sigla: e.target.value.toUpperCase() }));
                            }}
                            placeholder={t('admin.unidades.form.siglaPlaceholder')}
                            disabled={processing}
                        />
                    </FormField>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        router.get(route('institucional.unidades.index'));
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
    );
}
