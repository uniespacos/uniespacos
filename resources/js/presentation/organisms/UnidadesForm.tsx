import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FormField } from '@/presentation/molecules/FormField';
import { CadastrarUnidadeForm } from '@/presentation/pages/Administrativo/Unidades/CadastrarUnidade';
import { Instituicao } from '@/types';
import { useForm } from '@inertiajs/react';
import type React from 'react';
import { useEffect } from 'react';

interface UnidadeFormProps {
    data: CadastrarUnidadeForm;
    setData: ReturnType<typeof useForm<CadastrarUnidadeForm>>['setData'];
    submit: (e: React.SyntheticEvent) => void;
    errors: Record<string, string>;
    processing: boolean;
    title: string;
    description: string;
    instituicao: Instituicao;
}

export default function UnidadeForm({ data, setData, submit, errors, processing, title, description, instituicao }: UnidadeFormProps) {
    useEffect(() => {
        setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, instituicao_id: instituicao.id.toString() }));
    }, [instituicao, setData]);

    return (
        <form onSubmit={submit}>
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField label="Instituição" htmlFor="instituicao">
                        <Input id="instituicao" value={instituicao.nome} disabled />
                    </FormField>

                    <FormField label="Nome da unidade" htmlFor="nome" error={errors.nome} required>
                        <Input
                            id="nome"
                            value={data.nome}
                            onChange={(e) => {
                                setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, nome: e.target.value }));
                            }}
                            placeholder="Ex: Jequié ou Vitória da Conquista ..."
                            disabled={processing}
                        />
                    </FormField>

                    <FormField label="Sigla da unidade" htmlFor="sigla" error={errors.sigla} required>
                        <Input
                            id="sigla"
                            value={data.sigla}
                            onChange={(e) => {
                                setData((prevData: CadastrarUnidadeForm) => ({ ...prevData, sigla: e.target.value.toUpperCase() }));
                            }}
                            placeholder="Ex: JQ ou VCA ..."
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
