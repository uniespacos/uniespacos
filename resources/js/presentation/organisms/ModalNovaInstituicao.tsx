import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/presentation/molecules/FormField';
import { Modal } from '@/presentation/molecules/Modal';
import { useForm } from '@inertiajs/react';
import type React from 'react';

interface ModalNovaInstituicaoProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ModalNovaInstituicao({ open, onOpenChange, onSuccess }: ModalNovaInstituicaoProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        nome: '',
        sigla: '',
        endereco: '',
    });

    const handleSubmit = (e: React.SyntheticEvent) => {
        e.preventDefault();
        post(route('institucional.instituicoes.store'), {
            onSuccess: () => {
                reset();
                onOpenChange(false);
                onSuccess?.();
            },
        });
    };

    return (
        <Modal
            open={open}
            onOpenChange={onOpenChange}
            title="Cadastrar Nova Instituição"
            description="Preencha os dados da instituição para cadastrá-la no sistema."
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Nome da Instituição" htmlFor="novaInstituicaoNome" error={errors.nome} required>
                    <Input
                        id="novaInstituicaoNome"
                        value={data.nome}
                        onChange={(e) => {
                            setData('nome', e.target.value);
                        }}
                        placeholder="Ex: Universidade Estadual do Sudoeste da Bahia"
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>

                <FormField label="Sigla" htmlFor="novaInstituicaoSigla" error={errors.sigla} required>
                    <Input
                        id="novaInstituicaoSigla"
                        value={data.sigla}
                        onChange={(e) => {
                            setData('sigla', e.target.value.toUpperCase());
                        }}
                        placeholder="Ex: UESB"
                        maxLength={50}
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>

                <FormField label="Endereço" htmlFor="novaInstituicaoEndereco" error={errors.endereco}>
                    <Input
                        id="novaInstituicaoEndereco"
                        value={data.endereco}
                        onChange={(e) => {
                            setData('endereco', e.target.value);
                        }}
                        placeholder="Ex: Estrada do Bem Querer, km 04"
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>

                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                        }}
                        disabled={processing}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={processing || !data.nome.trim() || !data.sigla.trim()}>
                        {processing ? 'Salvando...' : 'Salvar Instituição'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
