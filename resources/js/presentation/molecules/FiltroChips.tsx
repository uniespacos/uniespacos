import { Label } from '@/components/ui/label';
import { Toggle } from '@/components/ui/toggle';

interface Opcao {
    value: string;
    label: string;
}

interface Props {
    label: string;
    opcoes: Opcao[];
    selecionados: string[];
    onChange: (valores: string[]) => void;
}

export function FiltroChips({ label, opcoes, selecionados, onChange }: Props) {
    return (
        <div className="space-y-2">
            <Label className="block">{label}</Label>
            <div className="flex flex-wrap gap-2">
                {opcoes.map((opcao) => (
                    <Toggle
                        key={opcao.value}
                        pressed={selecionados.includes(opcao.value)}
                        onPressedChange={(on) => {
                            onChange(on ? [...selecionados, opcao.value] : selecionados.filter((v) => v !== opcao.value));
                        }}
                        variant="outline"
                        size="sm"
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary rounded-full px-3"
                        aria-label={opcao.label}
                    >
                        {opcao.label}
                    </Toggle>
                ))}
            </div>
        </div>
    );
}
