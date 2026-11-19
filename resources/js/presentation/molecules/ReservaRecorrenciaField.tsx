import { Label } from '@/components/ui/label';
import { RadioGroup } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { opcoesRecorrencia } from '@/constants/recorrencia';
import { RecorrenciaReserva } from '@/contracts/recorrencia.contract';
import { useTranslation } from '@/i18n';
import { DatePicker } from '@/presentation/molecules/DatePicker';
import { OpcaoRadioCard } from '@/presentation/molecules/OpcaoRadioCard';
import { SlotCalendario } from '@/types';
import { ReservaFormData } from '@/types/reserva-stepper';
import { isBefore, max, startOfDay } from 'date-fns';
import React, { useId, useMemo } from 'react';

export interface ReservaRecorrenciaFieldProps {
    formData: ReservaFormData;
    setFormData: (key: keyof ReservaFormData, value: unknown) => void;
    slotsSelecao: SlotCalendario[];
    hoje: Date;
    erro?: string;
}

const opcoesDeRepeticao = opcoesRecorrencia.filter((opcao) => opcao.valor !== RecorrenciaReserva.UNICA);

export const ReservaRecorrenciaField: React.FC<ReservaRecorrenciaFieldProps> = ({ formData, setFormData, slotsSelecao, hoje, erro }) => {
    const { t, formatDate } = useTranslation();
    const switchId = useId();
    const dataFinalId = useId();
    const repetir = formData.recorrencia !== RecorrenciaReserva.UNICA;

    const limiteMinimo = useMemo(() => {
        const datas: Date[] = [startOfDay(hoje)];

        if (formData.data_inicial) {
            datas.push(startOfDay(formData.data_inicial));
        }
        if (slotsSelecao.length > 0) {
            datas.push(startOfDay(new Date(Math.max(...slotsSelecao.map((slot) => slot.data.getTime())))));
        }

        return max(datas);
    }, [hoje, formData.data_inicial, slotsSelecao]);

    const vigencia =
        formData.data_inicial && formData.data_final
            ? t('reservas.stepper.repeat_validity', {
                  periodo: t('reservas.stepper.period_range', {
                      inicio: formatDate(formData.data_inicial, 'dd/MM'),
                      fim: formatDate(formData.data_final, 'dd/MM'),
                  }),
              })
            : null;

    return (
        <section className="bg-card border-border/80 space-y-3 rounded-xl border p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                    <Label htmlFor={switchId} className="text-foreground text-sm font-semibold">
                        {t('reservas.stepper.repeat_question')}
                    </Label>
                    <p className="text-muted-foreground text-xs">
                        {repetir ? t('reservas.stepper.repeat_on_hint') : t('reservas.stepper.repeat_off_hint')}
                    </p>
                </div>
                <Switch
                    id={switchId}
                    checked={repetir}
                    onCheckedChange={(ligado) => {
                        setFormData('recorrencia', ligado ? RecorrenciaReserva.QUINZE_DIAS : RecorrenciaReserva.UNICA);
                    }}
                />
            </div>

            {repetir && (
                <div className="space-y-3">
                    <RadioGroup
                        value={formData.recorrencia}
                        onValueChange={(valor) => {
                            setFormData('recorrencia', valor);
                        }}
                        aria-label={t('reservas.stepper.repeat_pattern_label')}
                        className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    >
                        {opcoesDeRepeticao.map((opcao) => (
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

                    {formData.recorrencia === RecorrenciaReserva.PERSONALIZADO && (
                        <div className="space-y-1.5">
                            <Label htmlFor={dataFinalId} className="text-foreground text-sm font-medium">
                                {t('reservas.stepper.repeat_end_label')}
                            </Label>
                            <DatePicker
                                id={dataFinalId}
                                modal
                                value={formData.data_final ?? undefined}
                                onSelect={(data) => {
                                    setFormData('data_final', data);
                                }}
                                disabled={(data) => isBefore(startOfDay(data), limiteMinimo)}
                                placeholder={t('reservas.stepper.repeat_end_placeholder')}
                            />
                        </div>
                    )}

                    {vigencia && <p className="text-foreground text-sm font-medium">{vigencia}</p>}
                    {erro && <p className="text-destructive-accent text-sm font-medium">{erro}</p>}
                </div>
            )}
        </section>
    );
};

export default ReservaRecorrenciaField;
