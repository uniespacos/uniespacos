import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getMensagemBloqueioRemocao, nivelParaLabel, podeRemoverAndar } from '@/lib/utils/andars/AndarHelpers';
import { FormField } from '@/presentation/molecules/FormField';
import { AlertTriangle, Lock, Trash2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- useForm<T> do Inertia exige um index signature que `interface` não satisfaz.
export type AndarFormData = {
    id: string;
    nome: string;
    nivel: number;
    tipo_acesso: string[];
};

interface AndarCardProps {
    andar: AndarFormData;
    index: number;
    onUpdate: (andarId: string, andar: AndarFormData) => void;
    onRemove: (andarId: string) => void;
    todosAndares: AndarFormData[];
    errors?: Record<string, string>;
}

const tiposDeAcesso = [
    { id: 'terreo', label: 'Acesso Térreo' },
    { id: 'escada', label: 'Escada' },
    { id: 'elevador', label: 'Elevador' },
    { id: 'rampa', label: 'Rampa' },
];

export default function AndarFormCard({ andar, onUpdate, onRemove, todosAndares, errors }: AndarCardProps) {
    const handleTipoAcessoChange = (tipoId: string, checked: boolean) => {
        const novosTipos = checked ? [...andar.tipo_acesso, tipoId] : andar.tipo_acesso.filter((t) => t !== tipoId);

        onUpdate(andar.id, {
            ...andar,
            tipo_acesso: novosTipos,
        });
    };

    const handleNomeChange = (novoNome: string) => {
        onUpdate(andar.id, {
            ...andar,
            nome: novoNome,
        });
    };

    const podeRemover = podeRemoverAndar(andar, todosAndares);
    const mensagemBloqueio = getMensagemBloqueioRemocao(andar, todosAndares);

    return (
        <Card className={`relative ${andar.nivel === 0 ? 'border-primary/50' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold">{nivelParaLabel(andar.nivel)}</CardTitle>

                {andar.nivel === 0 ? (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-muted-foreground flex items-center">
                                    <Lock className="h-4 w-4" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>O andar térreo é obrigatório e não pode ser removido</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            onRemove(andar.id);
                                        }}
                                        disabled={!podeRemover}
                                        className={!podeRemover ? 'cursor-not-allowed opacity-50' : 'text-destructive-accent hover:text-destructive-accent'}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            {mensagemBloqueio && (
                                <TooltipContent>
                                    <p>{mensagemBloqueio}</p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    </TooltipProvider>
                )}
            </CardHeader>

            <CardContent className="space-y-4">
                <FormField label="Nome do andar" htmlFor={`andar-${andar.id}-nome`} error={errors?.[`andares.${andar.id}.nome`]} required>
                    <input
                        id={`andar-${andar.id}-nome`}
                        type="text"
                        value={andar.nome}
                        onChange={(e) => {
                            handleNomeChange(e.target.value);
                        }}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Ex: Térreo, 1º Andar, Subsolo 1"
                    />
                </FormField>

                <div className="space-y-2">
                    <Label className="text-sm font-medium">Tipos de Acesso *</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {tiposDeAcesso.map((tipo) => (
                            <div key={tipo.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`andar-${andar.id}-acesso-${tipo.id}`}
                                    checked={andar.tipo_acesso.includes(tipo.id)}
                                    onCheckedChange={(checked) => {
                                        handleTipoAcessoChange(tipo.id, checked as boolean);
                                    }}
                                />
                                <Label htmlFor={`andar-${andar.id}-acesso-${tipo.id}`} className="text-sm font-normal">
                                    {tipo.label}
                                </Label>
                            </div>
                        ))}
                    </div>
                    {andar.tipo_acesso.length === 0 && (
                        <div className="text-destructive-accent flex items-center space-x-1 text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Selecione pelo menos um tipo de acesso</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
