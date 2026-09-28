import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/presentation/molecules/FormField';
import { Modal } from '@/presentation/molecules/Modal';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

function MultiSelect({ value, onValueChange, processing }: { value: string[]; onValueChange: (values: string[]) => void; processing: boolean }) {
    const tiposDeAcesso = ['terreo', 'escada', 'elevador', 'rampa'];

    const handleSelect = (tipo: string) => {
        const newValue = value.includes(tipo) ? value.filter((v) => v !== tipo) : [...value, tipo];
        onValueChange(newValue);
    };

    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <div
                onClick={() => !processing && setOpen(!open)}
                className={`border-input bg-background ring-offset-background flex items-center justify-between rounded-md border px-3 py-2 text-sm ${processing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
                <div className="flex flex-wrap gap-1">
                    {value.length > 0 ? (
                        value
                            .filter((tipo: string) => value.includes(tipo))
                            .map((tipo: string, index: number) => (
                                <Badge key={index} variant="secondary" className="px-2 py-0">
                                    {tipo}
                                </Badge>
                            ))
                    ) : (
                        <span className="text-muted-foreground">Selecione os tipos de acesso</span>
                    )}
                </div>
                <div className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4 opacity-50"
                    >
                        <path d="m6 9 6 6 6-6" />
                    </svg>
                </div>
            </div>

            {open && (
                <div className="bg-popover absolute z-10 mt-1 w-full rounded-md border shadow-md">
                    <div className="p-1">
                        {tiposDeAcesso.map((tipo) => (
                            <div
                                key={tipo}
                                className={`hover:bg-accent hover:text-accent-foreground flex items-center space-x-2 rounded-sm px-2 py-1.5 ${value.includes(tipo) ? 'bg-accent/50' : ''}`}
                                onClick={() => {
                                    handleSelect(tipo);
                                }}
                            >
                                <Checkbox checked={value.includes(tipo)} className="pointer-events-none" />
                                <span className="text-sm">{tipo}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface AddAndarDialogProps {
    open: boolean;
    moduloSelecionado: number;
    setIsDialogOpen: (isOpen: boolean) => void;
}

export function AddAndarDialog({ open, moduloSelecionado, setIsDialogOpen }: AddAndarDialogProps) {
    const andaresPredefinidos = ['Térreo', ...Array.from({ length: 10 }, (_, i) => `${i + 1}º Andar`)];
    const [nomeNovoAndar, setNomeNovoAndar] = useState('');
    const [tipoAcessoNovoAndar, setTipoAcessoNovoAndar] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddNovoAndar = () => {
        if (!nomeNovoAndar.trim() || tipoAcessoNovoAndar.length === 0) {
            toast.error('Preencha o nome e ao menos um tipo de acesso.');
            return;
        }
        setIsSubmitting(true);
        router.post(
            route('institucional.andares.store'),
            { nome: nomeNovoAndar, tipo_acesso: tipoAcessoNovoAndar, modulo_id: moduloSelecionado },
            {
                onSuccess: () => {
                    toast.success('Andar adicionado com sucesso!');
                    setIsDialogOpen(false);
                },
                onError: (errors) => {
                    toast.error(Object.values(errors)[0] || 'Erro ao adicionar andar.');
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            },
        );
    };

    return (
        <Modal
            open={open}
            onOpenChange={setIsDialogOpen}
            title="Adicionar Novo Andar"
            footer={
                <>
                    <Button
                        variant="outline"
                        onClick={() => {
                            setIsDialogOpen(false);
                        }}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleAddNovoAndar} disabled={isSubmitting || !nomeNovoAndar || tipoAcessoNovoAndar.length === 0}>
                        {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                </>
            }
        >
            <div className="grid gap-4">
                <FormField label="Nome do Andar" htmlFor="novo-andar-nome">
                    <Select value={nomeNovoAndar} onValueChange={setNomeNovoAndar}>
                        <SelectTrigger id="novo-andar-nome">
                            <SelectValue placeholder="Selecione um andar" />
                        </SelectTrigger>
                        <SelectContent>
                            {andaresPredefinidos.map((andar) => (
                                <SelectItem key={andar} value={andar}>
                                    {andar}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormField>
                <div className="space-y-2">
                    <Label>Tipos de Acesso</Label>
                    <MultiSelect processing={isSubmitting} value={tipoAcessoNovoAndar} onValueChange={setTipoAcessoNovoAndar} />
                </div>
            </div>
        </Modal>
    );
}
