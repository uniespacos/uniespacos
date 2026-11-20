import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

export interface OpcaoRadioCardProps {
    value: string;
    id: string;
    titulo: string;
    descricao?: string;
    selecionado: boolean;
}

export function OpcaoRadioCard({ value, id, titulo, descricao, selecionado }: OpcaoRadioCardProps) {
    return (
        <Label
            htmlFor={id}
            className={cn(
                'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200',
                selecionado
                    ? 'border-primary bg-primary/10 ring-primary/30 shadow-xs ring-1'
                    : 'border-border bg-card hover:bg-muted/40 hover:border-border/80',
            )}
        >
            <RadioGroupItem value={value} id={id} className="mt-0.5" />
            <div className="grid gap-0.5">
                <span className="text-foreground text-sm font-medium">{titulo}</span>
                {descricao && <span className="text-muted-foreground text-xs leading-snug">{descricao}</span>}
            </div>
        </Label>
    );
}

export default OpcaoRadioCard;
