import { ESTILO_SLOT } from '@/constants/situacao-reserva';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

interface AgendaLegendaProps {
    isEditMode?: boolean;
}

export default function AgendaLegenda({ isEditMode = false }: AgendaLegendaProps) {
    const { t } = useTranslation();

    const itens = [
        { label: t('agenda.legenda.livre'), swatch: 'border border-border bg-background' },
        { label: t('agenda.legenda.encerrado'), swatch: 'bg-muted-foreground/40' },
        { label: t('agenda.legenda.reservado'), swatch: ESTILO_SLOT.reservado.solido },
        { label: t('agenda.legenda.selecionado'), swatch: ESTILO_SLOT.selecionado.solido },
        ...(isEditMode
            ? [
                  { label: t('agenda.legenda.solicitado'), swatch: ESTILO_SLOT.solicitado.solido },
                  { label: t('agenda.legenda.indeferido'), swatch: ESTILO_SLOT.indeferida.solido },
              ]
            : []),
    ];

    return (
        <div className="bg-muted/30 border-b px-3 py-2 text-xs">
            <div className="grid grid-cols-2 items-center gap-x-4 gap-y-1.5 md:flex md:flex-wrap">
                {itens.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <span aria-hidden className={cn('h-2.5 w-2.5 shrink-0 rounded-full', item.swatch)} />
                        <span className="text-muted-foreground">{item.label}</span>
                    </div>
                ))}
            </div>
            <p className="text-muted-foreground mt-1.5 hidden md:block">{t('agenda.legenda.dica_intervalo')}</p>
        </div>
    );
}
