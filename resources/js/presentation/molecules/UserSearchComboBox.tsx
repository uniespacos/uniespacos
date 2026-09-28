import type React from 'react';

import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/presentation/atoms/UserAvatar';
import type { User } from '@/types';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState } from 'react';

interface UserSearchComboboxProps {
    usuarios: User[];
    value: number | null;
    onValueChange: (value: number | null) => void;
    placeholder?: string;
    disabled?: boolean;
}

export function UserSearchCombobox({ usuarios, value, onValueChange, placeholder = 'Buscar usuário...', disabled = false }: UserSearchComboboxProps) {
    const [open, setOpen] = useState(false);
    const selectedUser = usuarios.find((user) => user.id === value);

    const handleSelect = (userId: number) => {
        onValueChange(userId === value ? null : userId);
        setOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        onValueChange(null);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-transparent font-normal"
                    disabled={disabled}
                    type="button"
                >
                    {selectedUser ? (
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <UserAvatar user={selectedUser} className="h-5 w-5" fallbackClassName="text-xs" />
                            <div className="flex min-w-0 flex-col items-start">
                                <span className="truncate text-sm font-medium">{selectedUser.name}</span>
                                <span className="text-muted-foreground truncate text-xs">{selectedUser.email}</span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <div className="flex items-center gap-1">
                        {selectedUser && (
                            <span
                                role="button"
                                tabIndex={0}
                                aria-label="Limpar seleção"
                                className="hover:bg-destructive hover:text-destructive-foreground flex h-4 w-4 cursor-pointer items-center justify-center rounded p-0"
                                onClick={handleClear}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        handleClear(e as unknown as React.MouseEvent);
                                    }
                                }}
                            >
                                <X className="h-3 w-3" />
                            </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[280px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Buscar por nome ou email..." />
                    <CommandList>
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                        <CommandGroup>
                            {usuarios.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={`${user.name} ${user.email}`}
                                    onSelect={() => {
                                        handleSelect(user.id);
                                    }}
                                >
                                    <Check className={cn('mr-2 h-4 w-4', value === user.id ? 'opacity-100' : 'opacity-0')} />
                                    <UserAvatar user={user} className="h-6 w-6" fallbackClassName="text-xs" />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.name}</span>
                                        <span className="text-muted-foreground text-xs">{user.email}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
