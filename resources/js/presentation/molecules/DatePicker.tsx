import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
    value?: Date;
    onSelect: (date: Date | undefined) => void;
    /** Predicado de dia desabilitado no calendário (não confundir com buttonDisabled). */
    disabled?: (date: Date) => boolean;
    /** Desabilita o próprio campo/gatilho, independente do calendário. */
    buttonDisabled?: boolean;
    /** Repassado ao Popover — necessário quando o DatePicker vive dentro de outro Dialog/Popover. */
    modal?: boolean;
    placeholder?: string;
    className?: string;
    id?: string;
    align?: 'start' | 'center' | 'end';
    clearable?: boolean;
}

export function DatePicker({
    value,
    onSelect,
    disabled,
    buttonDisabled,
    modal,
    placeholder = 'Selecione...',
    className,
    id,
    align = 'start',
    clearable = false,
}: DatePickerProps) {
    return (
        <Popover modal={modal}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant="outline"
                    disabled={buttonDisabled}
                    className={cn('w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    <span className="truncate">{value ? format(value, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align={align}>
                <Calendar mode="single" selected={value} onSelect={onSelect} disabled={disabled} initialFocus />
                {clearable && value && (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-xs"
                            onClick={() => {
                                onSelect(undefined);
                            }}
                        >
                            Limpar data
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
