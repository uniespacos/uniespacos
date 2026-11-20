import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { opcoesRecorrencia } from '@/constants/recorrencia';
import { EscopoRecorrencia } from '@/contracts';
import { useTranslation } from '@/i18n';
import { cn, parseDataLocal } from '@/lib/utils';
import { recorrenciaParaGravar } from '@/lib/utils/conflitos-reserva';
import { expandirHorariosRecorrencia } from '@/lib/utils/expandir-horarios-recorrencia';
import { publicoEstimadoVazio } from '@/lib/utils/publico-estimado';
import { ReservaConflictAlert } from '@/presentation/molecules/ReservaConflictAlert';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { CheckCircle2, Trash2 } from 'lucide-react';
import React, { useId, useMemo } from 'react';

export interface StepRevisaoConfirmacaoProps {
    espaco: Espaco;
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    isEditMode?: boolean;
    slotsSelecao: SlotCalendario[];
    conflictingDates: string[];
    temConflito: boolean;
    quantidadeEmConflito: number;
    onRemoverConflitos?: () => void;
    onRealtimeSlotsConflict: (slotIds: string[]) => void;
}

interface CampoResumoProps {
    rotulo: string;
    className?: string;
    children: React.ReactNode;
}

function CampoResumo({ rotulo, className, children }: CampoResumoProps) {
    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-muted-foreground text-xs">{rotulo}</dt>
            <dd className="text-foreground min-w-0 text-sm font-medium [overflow-wrap:anywhere] break-words">{children}</dd>
        </div>
    );
}

export const StepRevisaoConfirmacao: React.FC<StepRevisaoConfirmacaoProps> = ({
    espaco,
    formData,
    setFormData,
    isEditMode = false,
    slotsSelecao,
    conflictingDates,
    temConflito,
    quantidadeEmConflito,
    onRemoverConflitos,
    onRealtimeSlotsConflict,
}) => {
    const { t, formatDate } = useTranslation();
    const termoId = useId();
    const resumoId = useId();

    const rotuloRecorrencia = useMemo(() => {
        const opcao = opcoesRecorrencia.find((o) => o.valor === formData.recorrencia);
        return opcao ? t(opcao.labelKey) : formData.recorrencia;
    }, [formData.recorrencia, t]);

    const isSingleScopeEdit = isEditMode && formData.edit_scope === EscopoRecorrencia.SINGLE;

    const horariosGravados = useMemo(() => {
        const recorrencia = recorrenciaParaGravar(formData.recorrencia, isSingleScopeEdit);

        return expandirHorariosRecorrencia(formData.horarios_solicitados, recorrencia, formData.data_final);
    }, [isSingleScopeEdit, formData.horarios_solicitados, formData.recorrencia, formData.data_final]);

    const periodo = useMemo(() => {
        if (isSingleScopeEdit && horariosGravados.length > 0) {
            const primeiraData = parseDataLocal(horariosGravados[0].data);
            const ultimaData = parseDataLocal(horariosGravados[horariosGravados.length - 1].data);

            return t('reservas.stepper.period_range', {
                inicio: formatDate(primeiraData, 'dd/MM/yyyy'),
                fim: formatDate(ultimaData, 'dd/MM/yyyy'),
            });
        }

        return t('reservas.stepper.period_range', {
            inicio: formatDate(formData.data_inicial, 'dd/MM/yyyy'),
            fim: formatDate(formData.data_final, 'dd/MM/yyyy'),
        });
    }, [isSingleScopeEdit, horariosGravados, formData.data_inicial, formData.data_final, formatDate, t]);

    const publico = publicoEstimadoVazio(formData.publico_estimado) ? null : Number(formData.publico_estimado);
    const categoria = formData.categoria?.trim() ?? '';
    const descricao = formData.descricao.trim();

    return (
        <div className="space-y-5">
            <section aria-labelledby={resumoId} className="bg-card border-border/80 min-w-0 space-y-4 rounded-xl border p-4 shadow-xs">
                <h3 id={resumoId} className="text-foreground text-sm font-semibold">
                    {t('reservas.stepper.review_summary_title')}
                </h3>

                <dl className="grid gap-3 sm:grid-cols-2">
                    <CampoResumo rotulo={t('reservas.stepper.selected_space')}>
                        {espaco.nome}
                        <span className="text-muted-foreground block text-xs font-normal">
                            {t('espacos.capacidade', { count: String(espaco.capacidade_pessoas) })}
                        </span>
                    </CampoResumo>
                    <CampoResumo rotulo={t('reservas.stepper.title_label')}>{formData.titulo}</CampoResumo>
                    <CampoResumo rotulo={t('reservas.stepper.review_period')}>{periodo}</CampoResumo>
                    <CampoResumo rotulo={t('reservas.stepper.review_recurrence')}>{rotuloRecorrencia}</CampoResumo>
                    {publico !== null && (
                        <CampoResumo rotulo={t('reservas.stepper.review_public')}>
                            {t('reservas.stepper.review_people', { count: publico })}
                        </CampoResumo>
                    )}
                    {categoria && <CampoResumo rotulo={t('reservas.stepper.review_category')}>{categoria}</CampoResumo>}
                    <CampoResumo rotulo={t('reservas.stepper.review_details')} className="sm:col-span-2">
                        {descricao ? (
                            <span className="whitespace-pre-wrap">{descricao}</span>
                        ) : (
                            <span className="text-muted-foreground font-normal">{t('reservas.stepper.review_details_empty')}</span>
                        )}
                    </CampoResumo>
                </dl>
            </section>

            <section className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                        <CheckCircle2 className="text-primary h-4 w-4" aria-hidden="true" />
                        {t('reservas.stepper.reservation_slots')}
                    </h3>
                    <span className="text-muted-foreground text-xs">{t('reservas.stepper.total_a_gravar', { count: horariosGravados.length })}</span>
                </div>
                <ul className="bg-card border-border/80 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-xl border p-2.5">
                    {horariosGravados.map((horario) => (
                        <li
                            key={`${String(horario.agenda_id ?? '')}|${horario.data}|${horario.horario_inicio}`}
                            className="bg-muted/40 border-border text-foreground rounded-md border px-2 py-0.5 font-mono text-sm"
                        >
                            {`${formatDate(horario.data, 'dd/MM')} · ${horario.horario_inicio.slice(0, 5)}–${horario.horario_fim.slice(0, 5)}`}
                        </li>
                    ))}
                </ul>
            </section>

            <div className="space-y-3">
                <ReservaConflictAlert
                    espacoId={espaco.id}
                    selectedSlots={slotsSelecao}
                    conflictingDates={conflictingDates}
                    onRealtimeSlotsConflict={onRealtimeSlotsConflict}
                />

                {temConflito && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-foreground text-sm">{t('reservas.stepper.conflict.blocked_hint')}</p>
                        {onRemoverConflitos && quantidadeEmConflito > 0 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onRemoverConflitos}
                                className="text-destructive-accent hover:text-destructive-accent h-10 shrink-0 gap-1.5 px-4 text-sm"
                            >
                                <Trash2 className="text-destructive-accent h-4 w-4" aria-hidden="true" />
                                {t('reservas.stepper.conflict.remove_button')}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-muted/30 border-border/80 space-y-2 rounded-xl border p-3.5">
                <div className="flex items-start gap-3">
                    <Checkbox
                        id={termoId}
                        checked={Boolean(formData.termo_responsabilidade)}
                        onCheckedChange={(checked) => {
                            setFormData('termo_responsabilidade', checked === true);
                        }}
                        className="mt-0.5"
                    />
                    <div className="grid gap-1">
                        <Label htmlFor={termoId} className="text-foreground cursor-pointer text-sm leading-snug font-semibold">
                            {t('reservas.stepper.terms_title')}
                        </Label>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            {t('reservas.stepper.terms_description', { institution_name: 'UESB' })}
                        </p>
                        {!formData.termo_responsabilidade && (
                            <p className="text-foreground text-xs font-medium">{t('reservas.stepper.terms_hint')}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepRevisaoConfirmacao;
