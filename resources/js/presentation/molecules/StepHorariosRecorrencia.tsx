import { RadioGroup } from '@/components/ui/radio-group';
import { useTranslation } from '@/i18n';
import { agruparPeriodosPorDia } from '@/lib/utils/agrupar-periodos-por-dia';
import { OpcaoRadioCard } from '@/presentation/molecules/OpcaoRadioCard';
import { SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { Calendar, Repeat } from 'lucide-react';
import React, { useId, useMemo } from 'react';

export interface StepHorariosRecorrenciaProps {
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    slotsSelecao: SlotCalendario[];
    isEditMode?: boolean;
}

function primeiraLetraMaiuscula(texto: string): string {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export const StepHorariosRecorrencia: React.FC<StepHorariosRecorrenciaProps> = ({ formData, setFormData, slotsSelecao, isEditMode = false }) => {
    const { t, formatDate } = useTranslation();
    const resumoId = useId();

    const gruposPorDia = useMemo(() => agruparPeriodosPorDia(slotsSelecao), [slotsSelecao]);

    return (
        <div className="space-y-5">
            <section aria-labelledby={resumoId} className="bg-card border-border/80 space-y-3 rounded-xl border p-3.5 shadow-xs">
                <div className="space-y-0.5">
                    <h3 id={resumoId} className="text-foreground flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
                        {t('reservas.stepper.selected_slots')}
                    </h3>
                    <p className="text-muted-foreground pl-6 text-xs">
                        {slotsSelecao.length === 1
                            ? t('reservas.stepper.slot_selected')
                            : t('reservas.stepper.slots_selected', { count: String(slotsSelecao.length) })}
                    </p>
                </div>

                {gruposPorDia.length === 0 ? (
                    <p className="text-muted-foreground text-sm">{t('reservas.stepper.no_slots_selected')}</p>
                ) : (
                    <ul className="space-y-2">
                        {gruposPorDia.map((grupo) => (
                            <li key={grupo.chave} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-4">
                                <span className="text-foreground min-w-36 text-sm font-medium">
                                    {`${primeiraLetraMaiuscula(formatDate(grupo.data, 'EEE').slice(0, 3))}, ${formatDate(grupo.data, 'dd/MM')}`}
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {grupo.periodos.map((periodo) => (
                                        <span
                                            key={`${periodo.inicio}-${periodo.fim}`}
                                            className="bg-muted/40 border-border text-foreground rounded-md border px-2 py-0.5 font-mono text-sm"
                                        >
                                            {`${periodo.inicio}–${periodo.fim}`}
                                        </span>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {isEditMode && (
                <div className="space-y-2">
                    <p className="text-foreground flex items-center gap-1.5 text-sm font-semibold">
                        <Repeat className="text-primary h-4 w-4" aria-hidden="true" />
                        {t('reservas.stepper.edit_scope_label')}
                    </p>
                    <RadioGroup
                        value={formData.edit_scope ?? 'recurring'}
                        onValueChange={(valor) => {
                            setFormData('edit_scope', valor);
                        }}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                    >
                        <OpcaoRadioCard
                            value="recurring"
                            id="edit-scope-recurring"
                            titulo={t('reservas.stepper.scope_all_title')}
                            descricao={t('reservas.stepper.scope_all_desc')}
                            selecionado={formData.edit_scope === 'recurring'}
                        />
                        <OpcaoRadioCard
                            value="single"
                            id="edit-scope-single"
                            titulo={t('reservas.stepper.scope_week_title')}
                            descricao={t('reservas.stepper.scope_week_desc')}
                            selecionado={formData.edit_scope === 'single'}
                        />
                    </RadioGroup>
                </div>
            )}
        </div>
    );
};

export default StepHorariosRecorrencia;
