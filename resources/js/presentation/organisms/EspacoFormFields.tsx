import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormCadastroValues } from '@/presentation/pages/Administrativo/Espacos/CadastroEspaco';
import { useForm } from '@inertiajs/react';

interface FormValues {
    nome: string;
    capacidade_pessoas: number | undefined;
    descricao: string;
}

interface EspacoFormFieldsProps {
    data: FormValues;
    setData: ReturnType<typeof useForm<FormCadastroValues>>['setData'];
    errors: Partial<Record<keyof FormValues, string>>;
    processing: boolean;
}

export function EspacoFormFields({ data, setData, errors, processing }: EspacoFormFieldsProps) {
    return (
        <>
            <div className="space-y-2">
                <Label htmlFor="name">Nome do Espaço</Label>
                <Input
                    id="name"
                    placeholder="Ex: Sala 101, Laboratório de Informática"
                    value={data.nome}
                    maxLength={255}
                    onChange={(e) => {
                        setData((prevData: FormCadastroValues) => ({ ...prevData, nome: e.target.value }));
                    }}
                    disabled={processing}
                />
                {errors.nome && <p className="text-destructive-accent mt-1 text-sm">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="capacityPessoas">Capacidade (pessoas)</Label>
                <Input
                    id="capacityPessoas"
                    type="number"
                    min={1}
                    required
                    value={data.capacidade_pessoas || ''}
                    onChange={(e) => {
                        setData((prevData: FormCadastroValues) => ({ ...prevData, capacidade_pessoas: e.target.valueAsNumber }));
                    }}
                    disabled={processing}
                />
                {errors.capacidade_pessoas && <p className="text-destructive-accent mt-1 text-sm">{errors.capacidade_pessoas}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                    id="description"
                    placeholder="Descreva detalhes sobre o espaço..."
                    className="min-h-[120px]"
                    value={data.descricao}
                    onChange={(e) => {
                        setData((prevData: FormCadastroValues) => ({ ...prevData, descricao: e.target.value }));
                    }}
                    disabled={processing}
                />
                {errors.descricao && <p className="text-destructive-accent mt-1 text-sm">{errors.descricao}</p>}
            </div>
        </>
    );
}
