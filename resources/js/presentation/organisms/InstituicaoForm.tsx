import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/presentation/molecules/FormField';
import { CadastrarInstituicaoForm } from '@/presentation/pages/Administrativo/Instituicoes/CadastrarInstituicao';
import type React from 'react';

interface InstituicaoFormProps {
    data: CadastrarInstituicaoForm;
    setData: (key: keyof CadastrarInstituicaoForm, value: string) => void;
    submit: (e: React.SyntheticEvent) => void;
    errors: Partial<Record<keyof CadastrarInstituicaoForm, string>>;
    processing: boolean;
    title: string;
    description: string;
}

export default function InstituicaoForm({ data, setData, submit, errors, processing, title, description }: InstituicaoFormProps) {
    return (
        <form onSubmit={submit}>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField label="Nome da Instituição" htmlFor="nome" error={errors.nome} required>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => {
                                setData('nome', e.target.value);
                            }}
                            placeholder="Ex: Universidade Federal da Bahia"
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label="Sigla" htmlFor="sigla" error={errors.sigla} required>
                        <Input
                            id="sigla"
                            value={data.sigla}
                            onChange={(e) => {
                                setData('sigla', e.target.value.toUpperCase());
                            }}
                            placeholder="Ex: UFBA"
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label="Endereço" htmlFor="endereco" error={errors.endereco}>
                        <Input
                            id="endereco"
                            value={data.endereco}
                            onChange={(e) => {
                                setData('endereco', e.target.value);
                            }}
                            placeholder="Ex: Rua Barão de Jeremoabo, s/n"
                            disabled={processing}
                        />
                    </FormField>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={processing}>
                        {processing ? 'Salvando...' : 'Salvar'}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}
