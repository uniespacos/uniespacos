import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/presentation/molecules/FormField';
import { Instituicao, Setor, Unidade } from '@/types';
import { useForm } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import type React from 'react';

export interface SetorFormData {
    nome: string;
    sigla: string;
    unidade_id: string;
}

interface Props {
    setor?: Setor;
    instituicao: Instituicao;
    unidades: Unidade[];
    onSuccess?: () => void;
    onCancel: () => void;
}

export function SetorForm({ setor, instituicao, unidades, onSuccess, onCancel }: Props) {
    const { data, setData, post, put, processing, errors, reset } = useForm({
        nome: setor?.nome ?? '',
        sigla: setor?.sigla ?? '',
        unidade_id: setor?.unidade?.id ? String(setor.unidade.id) : '',
    });

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (setor) {
            put(route('institucional.setors.update', { setor: setor.id }), {
                onSuccess: () => {
                    onSuccess?.();
                },
            });
        } else {
            post(route('institucional.setors.store'), {
                onSuccess: () => {
                    reset();
                    onSuccess?.();
                },
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Instituição" htmlFor="instituicao">
                <Input id="instituicao" value={instituicao.nome} disabled />
            </FormField>

            <FormField label="Unidade" htmlFor="unidade" error={errors.unidade_id} required>
                <Select
                    value={data.unidade_id}
                    onValueChange={(val) => {
                        setData('unidade_id', val);
                    }}
                    disabled={processing}
                >
                    <SelectTrigger id="unidade">
                        <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                    <SelectContent>
                        {unidades.map((unidade) => (
                            <SelectItem key={unidade.id} value={unidade.id.toString()}>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {unidade.sigla} - {unidade.nome}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </FormField>

            <FormField label="Nome do Setor" htmlFor="nome" error={errors.nome} required>
                <Input
                    id="nome"
                    value={data.nome}
                    onChange={(e) => {
                        setData('nome', e.target.value);
                    }}
                    placeholder="Ex: Recursos Humanos"
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
                    placeholder="Ex: RH"
                    maxLength={10}
                    disabled={processing}
                />
            </FormField>

            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={processing}>
                    {processing ? (setor ? 'Atualizando...' : 'Criando...') : setor ? 'Atualizar' : 'Criar Setor'}
                </Button>
            </div>
        </form>
    );
}
