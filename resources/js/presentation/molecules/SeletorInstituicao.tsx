import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/presentation/atoms/InputError';
import type { Instituicao, Setor } from '@/types';
import { useEffect, useState } from 'react';

interface SeletorInstituicaoProps {
    instituicaos: Instituicao[];
    processing: boolean;
    onInstituicaoChange?: (instituicaoId: string) => void;
    onSetorChange: (setorId: string) => void;
    errors: Record<string, string>;
    initialSetorId?: string;
}

export function SeletorInstituicao({
    instituicaos,
    processing,
    onInstituicaoChange,
    onSetorChange,
    errors,
    initialSetorId,
}: SeletorInstituicaoProps) {
    const [instituicaoId, setInstituicaoId] = useState<string>('');
    const [setores, setSetores] = useState<Setor[]>([]);
    const [setorId, setSetorId] = useState<string>(initialSetorId || '');
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (initialSetorId && instituicaos.length > 0 && !isInitialized) {
            for (const inst of instituicaos) {
                const foundSetor = inst.setors?.find((s) => s.id.toString() === initialSetorId);
                if (foundSetor) {
                    const instId = inst.id.toString();
                    setInstituicaoId(instId);
                    setSetores(inst.setors || []);
                    setSetorId(initialSetorId);
                    onInstituicaoChange?.(instId);
                    setIsInitialized(true);
                    return;
                }
            }
        }
    }, [initialSetorId, instituicaos, isInitialized, onInstituicaoChange]);

    const handleInstituicaoChange = (value: string) => {
        setInstituicaoId(value);
        const instituicao = instituicaos.find((i) => i.id.toString() === value);
        setSetores(instituicao?.setors || []);
        setSetorId('');
        onInstituicaoChange?.(value);
        onSetorChange('');
    };

    const handleSetorChange = (value: string) => {
        setSetorId(value);
        onSetorChange(value);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Instituição *</Label>
                <Select value={instituicaoId} onValueChange={handleInstituicaoChange} disabled={processing}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione uma instituição" />
                    </SelectTrigger>
                    <SelectContent>
                        {instituicaos.map((instituicao) => (
                            <SelectItem key={instituicao.id} value={instituicao.id.toString()}>
                                {instituicao.nome}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.instituicao_id} />
            </div>

            <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={setorId} onValueChange={handleSetorChange} disabled={processing || !instituicaoId}>
                    <SelectTrigger className="h-11">
                        <SelectValue placeholder={!instituicaoId ? 'Selecione primeiro a instituição' : 'Selecione um setor'} />
                    </SelectTrigger>
                    <SelectContent>
                        {setores.map((setor) => (
                            <SelectItem key={setor.id} value={setor.id.toString()}>
                                {`[${setor.unidade?.sigla || 'N/A'}] - ${setor.nome}`}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <InputError message={errors.setor_id} />
            </div>
        </div>
    );
}
