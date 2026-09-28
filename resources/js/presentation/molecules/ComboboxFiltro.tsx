import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface OpcaoCombobox {
    id: number;
    nome: string;
}

interface Props {
    opcoes: OpcaoCombobox[];
    value?: number;
    onChange: (value: number | undefined) => void;
    placeholder?: string;
    placeholderBusca?: string;
    vazio?: string;
    disabled?: boolean;
    id?: string;
}

export function ComboboxFiltro({
    opcoes,
    value,
    onChange,
    placeholder = 'Todos',
    placeholderBusca = 'Buscar...',
    vazio = 'Nenhum resultado.',
    disabled = false,
    id,
}: Props) {
    const [aberto, setAberto] = useState(false);

    const selecionada = useMemo(() => opcoes.find((opcao) => opcao.id === value), [opcoes, value]);

    const handleSelect = (opcaoId: number) => {
        onChange(opcaoId === value ? undefined : opcaoId);
        setAberto(false);
    };

    return (
        <Popover open={aberto} onOpenChange={setAberto}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={aberto}
                    disabled={disabled}
                    className="w-full justify-between font-normal"
                >
                    <span className={cn('truncate', !selecionada && 'text-muted-foreground')}>{selecionada ? selecionada.nome : placeholder}</span>
                    <span className="flex items-center gap-1">
                        {selecionada && (
                            <span
                                role="button"
                                aria-label="Limpar seleção"
                                className="hover:bg-muted flex h-4 w-4 items-center justify-center rounded"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onChange(undefined);
                                }}
                            >
                                <X className="h-3 w-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholderBusca} />
                    <CommandList>
                        <CommandEmpty>{vazio}</CommandEmpty>
                        <CommandGroup>
                            {opcoes.map((opcao) => (
                                <CommandItem
                                    key={opcao.id}
                                    value={opcao.nome}
                                    onSelect={() => {
                                        handleSelect(opcao.id);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', opcao.id === value ? 'opacity-100' : 'opacity-0')} />
                                    {opcao.nome}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
