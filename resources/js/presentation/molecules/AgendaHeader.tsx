import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { useTranslation, type TranslationKey } from '@/i18n';
import { cn } from '@/lib/utils';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { AgendaGestoresPorTurnoType, Espaco } from '@/types';
import { Accessibility, Building2, ChevronDown, Home, MapPin, School, User, Users } from 'lucide-react';

interface AgendaHeaderProps {
    espaco: Espaco;
    gestoresPorTurno: Map<string, AgendaGestoresPorTurnoType>;
}

const ACESSIBILIDADE_KEYS: Partial<Record<string, TranslationKey>> = {
    terreo: 'espacos.acessibilidade.terreo',
    rampa: 'espacos.acessibilidade.rampa',
    elevador: 'espacos.acessibilidade.elevador',
    escada: 'espacos.acessibilidade.escada',
};

export default function AgendaHeader({ espaco, gestoresPorTurno }: AgendaHeaderProps) {
    const { t } = useTranslation();
    const unidadeLabel = espaco.andar?.modulo?.unidade?.sigla ?? espaco.andar?.modulo?.unidade?.nome;
    const tiposAcesso = espaco.andar?.tipo_acesso ?? [];

    return (
        <Card className="gap-3 p-3 shadow-sm md:p-4">
            <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold tracking-tight md:text-xl">
                <Home className="h-5 w-5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{espaco.nome}</span>
            </h1>

            <div className="flex flex-wrap gap-2">
                {unidadeLabel ? (
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <School className="h-3 w-3" />
                        {unidadeLabel}
                    </Badge>
                ) : null}
                {espaco.andar?.modulo?.nome ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {espaco.andar.modulo.nome}
                    </Badge>
                ) : null}
                {espaco.andar?.nome ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getAndarLabelByValue(espaco.andar.nome)}
                    </Badge>
                ) : null}
                <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {espaco.capacidade_pessoas === 1 ? t('espacos.pessoa') : t('espacos.pessoas', { count: String(espaco.capacidade_pessoas) })}
                </Badge>
                {tiposAcesso.map((acesso) => {
                    const key = ACESSIBILIDADE_KEYS[acesso];
                    return (
                        <Badge key={acesso} variant="outline" className="flex items-center gap-1">
                            <Accessibility className="h-3 w-3" />
                            {key ? t(key) : acesso}
                        </Badge>
                    );
                })}
            </div>

            <Collapsible>
                <CollapsibleTrigger
                    className={cn(
                        'text-muted-foreground hover:text-foreground group flex min-h-11 items-center gap-1.5 rounded-md text-xs font-semibold transition-colors md:min-h-8',
                        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                    )}
                >
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
                    {t('agenda.detalhes_espaco.titulo')}
                </CollapsibleTrigger>

                <CollapsibleContent className="space-y-4 pt-2">
                    {espaco.descricao && (
                        <div>
                            <p className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                                {t('espacos.detalhes.descricao')}
                            </p>
                            <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm leading-relaxed">{espaco.descricao}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">{t('espacos.detalhes.gestores')}</p>

                        <dl className="bg-muted/30 grid grid-cols-1 gap-x-4 gap-y-3 rounded-lg p-3 sm:grid-cols-3">
                            {TURNOS_ORDENADOS.map((turno) => {
                                const gestor = gestoresPorTurno.get(turno);

                                return (
                                    <div key={turno} className="flex flex-col gap-1 text-sm">
                                        <dt className="text-muted-foreground text-xs font-semibold">{t(`reservas.turnos.${turno}`)}</dt>
                                        <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                                            <User className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                                            {gestor ? (
                                                <div className="min-w-0">
                                                    <p className="text-sm leading-snug break-words">{gestor.nome}</p>
                                                    {gestor.email && <p className="text-muted-foreground text-xs break-all">{gestor.email}</p>}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">{t('agenda.sem_gestor')}</span>
                                            )}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
