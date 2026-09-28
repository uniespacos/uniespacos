import React from 'react';
import { Type, FileText, Users, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ReservaFormData } from '@/types/reserva-stepper';

export interface StepDadosJustificativaProps {
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    errors?: Record<string, string>;
}

export const StepDadosJustificativa: React.FC<StepDadosJustificativaProps> = ({ formData, setFormData, errors = {} }) => {
    return (
        <div className="space-y-4">
            {/* Título da Reserva / Evento */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="titulo" className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Type className="text-primary h-3.5 w-3.5" />
                        Título da Reserva / Evento <span className="text-destructive-accent">*</span>
                    </Label>
                    <span className="text-muted-foreground text-[11px]">{formData.titulo.length}/255</span>
                </div>
                <Input
                    id="titulo"
                    value={formData.titulo}
                    maxLength={255}
                    onChange={(e) => {
                        setFormData('titulo', e.target.value);
                    }}
                    placeholder="Ex: Aula Inaugural de Computação, Reunião de Colegiado..."
                    className="bg-card h-9 text-xs sm:text-sm"
                    aria-invalid={Boolean(errors.titulo)}
                />
                {errors.titulo && <p className="text-destructive-accent text-[11px] font-medium">{errors.titulo}</p>}
            </div>

            {/* Descrição e Justificativa */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="descricao" className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <FileText className="text-primary h-3.5 w-3.5" />
                        Justificativa e Detalhamento das Atividades <span className="text-destructive-accent">*</span>
                    </Label>
                    <span className="text-muted-foreground text-[11px]">{formData.descricao.length}/1000</span>
                </div>
                <Textarea
                    id="descricao"
                    value={formData.descricao}
                    maxLength={1000}
                    rows={4}
                    onChange={(e) => {
                        setFormData('descricao', e.target.value);
                    }}
                    placeholder="Descreva o objetivo institucional do evento, equipamentos necessários ou justificativa da solicitação para apreciação dos gestores..."
                    className="bg-card resize-none text-xs sm:text-sm"
                    aria-invalid={Boolean(errors.descricao)}
                />
                {errors.descricao && <p className="text-destructive-accent text-[11px] font-medium">{errors.descricao}</p>}
            </div>

            {/* Campos Complementares em Grid */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                {/* Público Estimado */}
                <div className="space-y-1.5">
                    <Label htmlFor="publico_estimado" className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                        <Users className="text-muted-foreground h-3.5 w-3.5" />
                        Público Estimado (opcional)
                    </Label>
                    <Input
                        id="publico_estimado"
                        type="number"
                        min={1}
                        max={5000}
                        value={formData.publico_estimado ?? ''}
                        onChange={(e) => {
                            setFormData('publico_estimado', e.target.value ? Number(e.target.value) : '');
                        }}
                        placeholder="Ex: 40"
                        className="bg-card h-9 text-xs sm:text-sm"
                    />
                </div>

                {/* Categoria / Finalidade */}
                <div className="space-y-1.5">
                    <Label htmlFor="categoria" className="text-foreground flex items-center gap-1.5 text-xs font-medium">
                        <Tag className="text-muted-foreground h-3.5 w-3.5" />
                        Categoria / Tipo (opcional)
                    </Label>
                    <Input
                        id="categoria"
                        value={formData.categoria ?? ''}
                        onChange={(e) => {
                            setFormData('categoria', e.target.value);
                        }}
                        placeholder="Ex: Aula, Palestra, Defesa, Extensão..."
                        className="bg-card h-9 text-xs sm:text-sm"
                    />
                </div>
            </div>
        </div>
    );
};

export default StepDadosJustificativa;
