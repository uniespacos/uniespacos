import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { opcoesRecorrencia } from '@/constants/recorrencia';
import { EscopoRecorrencia, RecorrenciaReserva } from '@/contracts';
import { useTranslation } from '@/i18n';
import { cn, parseDataLocal } from '@/lib/utils';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { ReservaConflictAlert } from '@/presentation/molecules/ReservaConflictAlert';
import { Espaco, SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { format, isBefore, max, startOfDay } from 'date-fns';
import { Calendar, Info, Repeat } from 'lucide-react';
import React, { useMemo } from 'react';

export interface StepHorariosRecorrenciaProps {
    espaco: Espaco;
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    slotsSelecao: SlotCalendario[];
    hoje: Date;
    isEditMode?: boolean;
    conflictingDates?: string[];
    onConflictDetected?: (hasConflict: boolean) => void;
    setSlotsSelecao?: (slots: SlotCalendario[]) => void;
    showRecurrenceAlert?: boolean;
}

interface GrupoDiaSlot {
    data: Date;
    slots: SlotCalendario[];
}

function OpcaoRadioCard({
    value,
    id,
    titulo,
    descricao,
    selecionado,
}: {
    value: string;
    id: string;
    titulo: string;
    descricao?: string;
    selecionado: boolean;
}) {
    return (
        <Label
            htmlFor={id}
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all duration-200',
                selecionado
                    ? 'border-primary bg-primary/10 ring-primary/30 shadow-xs ring-1'
                    : 'border-border hover:bg-muted/40 hover:border-border/80',
            )}
        >
            <RadioGroupItem value={value} id={id} className="mt-0.5" />
            <div className="grid gap-0.5">
                <span className="text-foreground text-xs font-medium sm:text-sm">{titulo}</span>
                {descricao && <span className="text-muted-foreground text-[11px] leading-tight">{descricao}</span>}
            </div>
        </Label>
    );
}

export const StepHorariosRecorrencia: React.FC<StepHorariosRecorrenciaProps> = ({
    espaco,
    formData,
    setFormData,
    slotsSelecao,
    hoje,
    isEditMode = false,
    conflictingDates = [],
    onConflictDetected,
    showRecurrenceAlert = false,
}) => {
    const { t, formatDate } = useTranslation();

    const slotsExibidos = useMemo(() => {
        const devePodarNaPrevia =
            isEditMode &&
            formData.edit_scope === EscopoRecorrencia.RECURRING &&
            (formData.recorrencia === RecorrenciaReserva.QUINZE_DIAS || formData.recorrencia === RecorrenciaReserva.UM_MES) &&
            Boolean(formData.data_final);

        if (!devePodarNaPrevia || !formData.data_final) {
            return slotsSelecao;
        }

        const dataFinalIso = format(parseDataLocal(formData.data_final), 'yyyy-MM-dd');
        return slotsSelecao.filter((slot) => format(parseDataLocal(slot.data), 'yyyy-MM-dd') <= dataFinalIso);
    }, [isEditMode, formData.edit_scope, formData.recorrencia, formData.data_final, slotsSelecao]);

    const slotsAgrupadosPorDia = useMemo(() => {
        const agrupamento: Record<string, GrupoDiaSlot | undefined> = {};

        slotsExibidos.forEach((slot) => {
            const dataObj = parseDataLocal(slot.data);
            const diaKey = format(dataObj, 'yyyy-MM-dd');
            const grupo = agrupamento[diaKey];

            if (!grupo) {
                agrupamento[diaKey] = {
                    data: dataObj,
                    slots: [slot],
                };
            } else {
                grupo.slots.push(slot);
            }
        });

        const listaGrupos: Record<string, GrupoDiaSlot> = {};
        Object.entries(agrupamento)
            .sort(([a], [b]) => a.localeCompare(b))
            .forEach(([key, val]) => {
                if (val) {
                    val.slots.sort((a, b) => a.horario_inicio.localeCompare(b.horario_inicio));
                    listaGrupos[key] = val;
                }
            });

        return listaGrupos;
    }, [slotsExibidos]);

    const maiorDataSelecionada = useMemo(() => {
        if (slotsExibidos.length === 0) return undefined;
        return new Date(Math.max(...slotsExibidos.map((s) => parseDataLocal(s.data).getTime())));
    }, [slotsExibidos]);

    const periodoFormatado = useMemo(() => {
        const dataIni = formData.data_inicial ? parseDataLocal(formData.data_inicial) : null;
        const dataFim = formData.data_final ? parseDataLocal(formData.data_final) : null;

        return {
            inicio: dataIni ? formatDate(dataIni) : 'N/I',
            fim: dataFim ? formatDate(dataFim) : 'N/I',
        };
    }, [formData.data_inicial, formData.data_final, formatDate]);

    return (
        <div className="space-y-4">
            {/* Alerta de Conflitos em Tempo Real */}
            <ReservaConflictAlert
                espacoId={espaco.id}
                selectedSlots={slotsExibidos}
                conflictingDates={conflictingDates}
                onConflictDetected={onConflictDetected}
            />

            {/* Escopo de Edição (apenas em modo de edição) */}
            {isEditMode && (
                <div className="bg-muted/30 border-border/80 space-y-2 rounded-xl border p-3">
                    <Label className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Repeat className="text-primary h-3.5 w-3.5" />
                        {t('reservas.stepper.edit_scope_label')}
                    </Label>
                    <RadioGroup
                        value={formData.edit_scope ?? EscopoRecorrencia.RECURRING}
                        onValueChange={(v) => {
                            setFormData('edit_scope', v);
                        }}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                        <OpcaoRadioCard
                            value={EscopoRecorrencia.RECURRING}
                            id="edit-scope-recurring"
                            titulo={t('reservas.stepper.scope_all_title')}
                            descricao={t('reservas.stepper.scope_all_desc')}
                            selecionado={formData.edit_scope === EscopoRecorrencia.RECURRING}
                        />
                        <OpcaoRadioCard
                            value={EscopoRecorrencia.SINGLE}
                            id="edit-scope-single"
                            titulo={t('reservas.stepper.scope_week_title')}
                            descricao={t('reservas.stepper.scope_week_desc')}
                            selecionado={formData.edit_scope === EscopoRecorrencia.SINGLE}
                        />
                    </RadioGroup>
                </div>
            )}

            {/* Seleção do Padrão de Recorrência */}
            <div className="space-y-2">
                <Label className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                    <Repeat className="text-primary h-3.5 w-3.5" />
                    {t('reservas.stepper.recurrence_pattern')}
                </Label>
                <RadioGroup
                    value={formData.recorrencia}
                    onValueChange={(v) => {
                        setFormData('recorrencia', v);
                    }}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                    {opcoesRecorrencia.map((opcao) => (
                        <OpcaoRadioCard
                            key={opcao.valor}
                            value={opcao.valor}
                            id={`rec-${opcao.valor}`}
                            titulo={t(opcao.labelKey)}
                            descricao={t(opcao.descricaoKey)}
                            selecionado={formData.recorrencia === opcao.valor}
                        />
                    ))}
                </RadioGroup>
            </div>

            {/* Seletor de Intervalo de Datas */}
            <div className="bg-muted/30 border-border/70 grid grid-cols-1 gap-3 rounded-xl border p-3.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="data-inicial" className="text-foreground text-xs font-medium">
                        {t('reservas.stepper.start_date')} {t('reservas.stepper.calculated')}
                    </Label>
                    <DatePicker
                        id="data-inicial"
                        modal
                        value={formData.data_inicial ? parseDataLocal(formData.data_inicial) : undefined}
                        buttonDisabled
                        placeholder={t('reservas.stepper.select_start_date')}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="data-final" className="text-foreground text-xs font-medium">
                        {t('reservas.stepper.end_date')} {formData.recorrencia !== RecorrenciaReserva.PERSONALIZADO && t('reservas.stepper.calculated')}
                    </Label>
                    <DatePicker
                        modal
                        value={formData.data_final ? parseDataLocal(formData.data_final) : undefined}
                        onSelect={(date) => {
                            setFormData('data_final', date);
                        }}
                        buttonDisabled={formData.recorrencia !== RecorrenciaReserva.PERSONALIZADO}
                        disabled={(date) => {
                            const limiteMinimo = max([
                                startOfDay(hoje),
                                ...(formData.data_inicial ? [startOfDay(parseDataLocal(formData.data_inicial))] : []),
                                ...(maiorDataSelecionada ? [startOfDay(maiorDataSelecionada)] : []),
                            ]);
                            return isBefore(startOfDay(date), limiteMinimo);
                        }}
                        placeholder={t('reservas.stepper.select_end_date')}
                    />
                </div>
            </div>

            {/* Banner Informativo do Período Calculado */}
            <div className="bg-card border-border/70 flex items-start gap-2.5 rounded-xl border p-3 text-xs">
                <Info className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1 space-y-0.5">
                    <span className="text-foreground font-semibold">{t('reservas.stepper.period_validity')}</span>
                    <p className="text-muted-foreground">
                        {t('reservas.stepper.period_from')} <span className="text-foreground font-medium">{periodoFormatado.inicio}</span>{' '}
                        {t('reservas.stepper.period_to')} <span className="text-foreground font-medium">{periodoFormatado.fim}</span>.
                    </p>
                </div>
            </div>

            {showRecurrenceAlert && (
                <div className="bg-warning/10 border-warning-accent/30 text-foreground flex items-start gap-2.5 rounded-xl border p-3 text-xs">
                    <Repeat className="text-warning-accent mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-muted-foreground">{t('reservas.stepper.recurrence_notice')}</p>
                </div>
            )}

            {/* Lista dos Horários Selecionados */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-foreground flex items-center gap-1.5 text-xs font-semibold">
                        <Calendar className="text-primary h-3.5 w-3.5" />
                        {t('reservas.stepper.selected_slots')}
                    </Label>
                    <Badge variant="secondary" className="text-[11px] font-medium">
                        {slotsExibidos.length}{' '}
                        {slotsExibidos.length === 1 ? t('reservas.stepper.slot_unit_single') : t('reservas.stepper.slot_unit_plural')}
                    </Badge>
                </div>

                <ScrollArea className="border-border/80 bg-card h-36 rounded-xl border p-3">
                    {Object.entries(slotsAgrupadosPorDia).length === 0 ? (
                        <div className="text-muted-foreground flex h-full items-center justify-center py-6 text-xs">
                            {t('reservas.stepper.no_slots_selected')}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {Object.entries(slotsAgrupadosPorDia).map(([diaKey, { data, slots }]) => (
                                <div key={diaKey} className="space-y-1.5">
                                    <span className="text-foreground flex items-center gap-1.5 text-xs font-semibold capitalize">
                                        <div className="bg-primary h-1.5 w-1.5 rounded-full" />
                                        {formatDate(data, 'EEEE, dd/MM/yyyy')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 pl-3">
                                        {slots.map((slot) => (
                                            <Badge
                                                key={slot.id}
                                                variant="outline"
                                                className="bg-muted/40 border-border text-foreground px-2 py-0.5 font-mono text-[11px]"
                                            >
                                                {slot.horario_inicio.slice(0, 5)} - {slot.horario_fim.slice(0, 5)}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
};

export default StepHorariosRecorrencia;
