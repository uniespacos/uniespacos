import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import { FormField } from '@/presentation/molecules/FormField';
import { type CadastrarInstituicaoForm } from '@/types/admin-forms';
import { router } from '@inertiajs/react';
import type React from 'react';

interface InstituicaoFormProps {
    data: CadastrarInstituicaoForm;
    setData: (key: keyof CadastrarInstituicaoForm, value: string) => void;
    submit: (e: React.SyntheticEvent) => void;
    errors: Partial<Record<keyof CadastrarInstituicaoForm, string>>;
    processing: boolean;
    editMode: boolean;
}

export default function InstituicaoForm({ data, setData, submit, errors, processing, editMode }: InstituicaoFormProps) {
    const { t } = useTranslation();

    return (
        <form onSubmit={submit} className="space-y-6">
            <Card>
                <CardContent className="space-y-4">
                    <FormField label={t('admin.instituicoes.form.nome')} htmlFor="nome" error={errors.nome} required>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => {
                                setData('nome', e.target.value);
                            }}
                            placeholder={t('admin.instituicoes.form.nomePlaceholder')}
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label={t('admin.instituicoes.form.sigla')} htmlFor="sigla" error={errors.sigla} required>
                        <Input
                            id="sigla"
                            value={data.sigla}
                            onChange={(e) => {
                                setData('sigla', e.target.value.toUpperCase());
                            }}
                            placeholder={t('admin.instituicoes.form.siglaPlaceholder')}
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label={t('admin.instituicoes.form.endereco')} htmlFor="endereco" error={errors.endereco}>
                        <Input
                            id="endereco"
                            value={data.endereco}
                            onChange={(e) => {
                                setData('endereco', e.target.value);
                            }}
                            placeholder={t('admin.instituicoes.form.enderecoPlaceholder')}
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
                        router.get(route('institucional.instituicoes.index'));
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
