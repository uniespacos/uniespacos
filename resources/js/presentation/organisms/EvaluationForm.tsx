import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { SituacaoReserva, type SituacaoReservaType } from '@/contracts';
import { useTranslation } from '@/i18n';
import { FormField } from '@/presentation/molecules/FormField';
import { SlotCalendario } from '@/types';
import { router } from '@inertiajs/react';
import { CheckCircle, Info, XCircle } from 'lucide-react';
import type React from 'react';

declare function route(name: string, params?: unknown): string;

interface FormData {
    situacao: string;
    motivo: string;
    observacao: string;
    evaluation_scope: 'single' | 'recurring';
}

interface EvaluationFormProps {
    data: FormData;
    setData: (field: keyof FormData, value: unknown) => void;
    decisao: SituacaoReservaType;
    isSubmitting: boolean;
    isRadioGroupDisabled: boolean;
    slotsSelecao: SlotCalendario[];
    isReavaliacao: boolean;
    onDecisaoChange: (value: SituacaoReservaType) => void;
    onSubmit: (e: React.SyntheticEvent) => void;
}

export default function EvaluationForm({
    data,
    setData,
    decisao,
    isSubmitting,
    isRadioGroupDisabled,
    slotsSelecao,
    onDecisaoChange,
    onSubmit,
    isReavaliacao,
}: EvaluationFormProps) {
    const { t } = useTranslation();

    const showMotivoField =
        decisao === SituacaoReserva.INDEFERIDA ||
        slotsSelecao.some((slot) => slot.status === SituacaoReserva.INDEFERIDA) ||
        (isReavaliacao && Boolean(data.motivo));

    return (
        <form onSubmit={onSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle>{isReavaliacao ? t('reservas.avaliacao.reavaliacao_titulo') : t('reservas.avaliacao.titulo')}</CardTitle>
                    <CardDescription>
                        {isReavaliacao ? t('reservas.avaliacao.reavaliacao_descricao') : t('reservas.avaliacao.descricao')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isReavaliacao && (
                        <Alert className="border-info-accent/30 bg-info-subtle text-info-accent">
                            <Info className="text-info-accent h-4 w-4" />
                            <AlertTitle className="text-info-accent font-semibold">{t('reservas.avaliacao.reavaliacao_titulo')}</AlertTitle>
                            <AlertDescription className="text-info-accent/90 text-sm">
                                {t('reservas.avaliacao.reavaliacao_descricao')}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label className="font-medium">{t('reservas.avaliacao.escopo_edicao')}:</Label>
                        <RadioGroup
                            value={data.evaluation_scope}
                            onValueChange={(value: 'single' | 'recurring') => {
                                setData('evaluation_scope', value);
                            }}
                            className="space-y-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="recurring" id="scope-recurring" />
                                <Label htmlFor="scope-recurring" className="cursor-pointer">
                                    {t('reservas.avaliacao.escopo_todas')}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="single" id="scope-single" />
                                <Label htmlFor="scope-single" className="cursor-pointer">
                                    {t('reservas.avaliacao.escopo_semana')}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-medium">{t('reservas.avaliacao.decisao')}</Label>
                        <RadioGroup
                            value={decisao}
                            onValueChange={(val) => { onDecisaoChange(val as SituacaoReservaType); }}
                            disabled={isRadioGroupDisabled}
                        >
                            <div className="has-[:checked]:border-success-accent/30 has-[:checked]:bg-success-subtle flex items-center space-x-2 rounded-lg border p-3">
                                <RadioGroupItem value={SituacaoReserva.DEFERIDA} id="deferida" />
                                <Label htmlFor="deferida" className="flex w-full cursor-pointer items-center gap-2">
                                    <CheckCircle className="text-success-accent h-4 w-4" />
                                    {t('reservas.avaliacao.deferir')}
                                </Label>
                            </div>
                            <div className="has-[:checked]:border-destructive-accent/30 has-[:checked]:bg-destructive-subtle flex items-center space-x-2 rounded-lg border p-3">
                                <RadioGroupItem value={SituacaoReserva.INDEFERIDA} id="indeferida" />
                                <Label htmlFor="indeferida" className="flex w-full cursor-pointer items-center gap-2">
                                    <XCircle className="text-destructive-accent h-4 w-4" />
                                    {t('reservas.avaliacao.indeferir')}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {showMotivoField && (
                        <FormField label={t('reservas.avaliacao.parecer')} htmlFor="motivo" required>
                            <Textarea
                                id="motivo"
                                placeholder={t('reservas.avaliacao.parecer_placeholder')}
                                value={data.motivo}
                                onChange={(e) => {
                                    setData('motivo', e.target.value);
                                }}
                                className="border-destructive-accent/30 focus:border-destructive-accent min-h-[100px]"
                            />
                        </FormField>
                    )}

                    <FormField label={t('reservas.avaliacao.observacao')} htmlFor="observacao">
                        <Textarea
                            id="observacao"
                            placeholder={t('reservas.avaliacao.observacao_placeholder')}
                            value={data.observacao}
                            onChange={(e) => {
                                setData('observacao', e.target.value);
                            }}
                            className="border-info-accent/30 focus:border-info-accent min-h-[100px]"
                        />
                    </FormField>

                    <div className="flex gap-3 border-t pt-4">
                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                            {isSubmitting ? t('reservas.avaliacao.salvando') : t('reservas.avaliacao.salvar')}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="px-8"
                            onClick={() => {
                                router.get(route('gestor.reservas.index'));
                            }}
                        >
                            {t('common.actions.cancel')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
