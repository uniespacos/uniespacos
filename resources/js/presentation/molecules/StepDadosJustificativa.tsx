import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/i18n';
import { PUBLICO_ESTIMADO_MAX, PUBLICO_ESTIMADO_MIN, publicoEstimadoAcimaDaCapacidade } from '@/lib/utils/publico-estimado';
import { ErrosEtapa, ReservaFormData } from '@/types/reserva-stepper';
import React, { useId } from 'react';

export interface StepDadosJustificativaProps {
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    errors?: ErrosEtapa;
    capacidade?: number;
}

const TITULO_MAX = 255;
const DESCRICAO_MAX = 2000;
const CATEGORIA_MAX = 100;

export const StepDadosJustificativa: React.FC<StepDadosJustificativaProps> = ({ formData, setFormData, errors = {}, capacidade }) => {
    const { t } = useTranslation();
    const tituloId = useId();
    const descricaoId = useId();
    const publicoId = useId();
    const categoriaId = useId();
    const sugestoesId = useId();

    const sugestoesCategoria = [
        t('reservas.stepper.category_suggestions.aula'),
        t('reservas.stepper.category_suggestions.palestra'),
        t('reservas.stepper.category_suggestions.reuniao'),
        t('reservas.stepper.category_suggestions.defesa'),
        t('reservas.stepper.category_suggestions.evento'),
        t('reservas.stepper.category_suggestions.extensao'),
    ];

    const acimaDaCapacidade = publicoEstimadoAcimaDaCapacidade(formData.publico_estimado, capacidade);

    return (
        <div className="space-y-5">
            <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={tituloId} className="text-foreground text-sm font-semibold">
                        {t('reservas.stepper.title_label')}
                        <span className="text-destructive-accent" aria-hidden="true">
                            {' *'}
                        </span>
                    </Label>
                    <span className="text-muted-foreground text-xs">
                        {t('reservas.stepper.char_counter', { count: formData.titulo.length, max: TITULO_MAX })}
                    </span>
                </div>
                <Input
                    id={tituloId}
                    value={formData.titulo}
                    maxLength={TITULO_MAX}
                    aria-required="true"
                    onChange={(e) => {
                        setFormData('titulo', e.target.value);
                    }}
                    placeholder={t('reservas.stepper.title_placeholder')}
                    className="bg-card h-10 text-sm"
                    aria-invalid={Boolean(errors.titulo)}
                />
                {errors.titulo && <p className="text-destructive-accent text-sm font-medium">{errors.titulo}</p>}
            </div>

            <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor={descricaoId} className="text-foreground text-sm font-semibold">
                        {t('reservas.stepper.description_label')}
                    </Label>
                    <span className="text-muted-foreground text-xs">
                        {t('reservas.stepper.char_counter', { count: formData.descricao.length, max: DESCRICAO_MAX })}
                    </span>
                </div>
                <Textarea
                    id={descricaoId}
                    value={formData.descricao}
                    maxLength={DESCRICAO_MAX}
                    rows={3}
                    onChange={(e) => {
                        setFormData('descricao', e.target.value);
                    }}
                    placeholder={t('reservas.stepper.description_placeholder')}
                    className="bg-card min-h-24 resize-y text-sm"
                    aria-invalid={Boolean(errors.descricao)}
                />
                {errors.descricao && <p className="text-destructive-accent text-sm font-medium">{errors.descricao}</p>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor={publicoId} className="text-foreground text-sm font-semibold">
                        {t('reservas.stepper.public_label')}
                    </Label>
                    <Input
                        id={publicoId}
                        type="number"
                        inputMode="numeric"
                        min={PUBLICO_ESTIMADO_MIN}
                        max={PUBLICO_ESTIMADO_MAX}
                        step={1}
                        value={formData.publico_estimado ?? ''}
                        onChange={(e) => {
                            setFormData('publico_estimado', e.target.value);
                        }}
                        placeholder={t('reservas.stepper.public_placeholder')}
                        className="bg-card h-10 text-sm"
                        aria-invalid={Boolean(errors.publico_estimado)}
                    />
                    {errors.publico_estimado && <p className="text-destructive-accent text-sm font-medium">{errors.publico_estimado}</p>}
                    {acimaDaCapacidade && capacidade !== undefined && (
                        <p role="status" className="bg-warning-subtle text-warning-accent rounded-md px-2.5 py-1.5 text-sm">
                            {t('reservas.stepper.public_over_capacity', { count: capacidade })}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor={categoriaId} className="text-foreground text-sm font-semibold">
                        {t('reservas.stepper.category_label')}
                    </Label>
                    <Input
                        id={categoriaId}
                        list={sugestoesId}
                        maxLength={CATEGORIA_MAX}
                        value={formData.categoria ?? ''}
                        onChange={(e) => {
                            setFormData('categoria', e.target.value);
                        }}
                        placeholder={t('reservas.stepper.category_placeholder')}
                        className="bg-card h-10 text-sm"
                    />
                    <datalist id={sugestoesId}>
                        {sugestoesCategoria.map((sugestao) => (
                            <option key={sugestao} value={sugestao} />
                        ))}
                    </datalist>
                </div>
            </div>
        </div>
    );
};

export default StepDadosJustificativa;
