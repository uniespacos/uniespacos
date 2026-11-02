import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TURNOS_ORDENADOS } from '@/constants/turnos';
import { useTranslation, type TranslationKey } from '@/i18n';
import { getAndarLabelByValue } from '@/lib/utils/andars/AndarOptions';
import { AgendaGestoresPorTurnoType, Espaco } from '@/types';
import { Accessibility, Building2, Home, MapPin, School, User, Users } from 'lucide-react';

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
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Home className="h-5 w-5 shrink-0" />
                    <span>{espaco.nome}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="mb-4 flex flex-wrap gap-2">
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
                {espaco.descricao && (
                    <div className="mb-3">
                        <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wide uppercase">
                            {t('espacos.detalhes.descricao')}
                        </h4>
                        <p className="bg-muted/50 text-muted-foreground rounded-lg p-3 text-sm leading-relaxed">{espaco.descricao}</p>
                    </div>
                )}
                <div className="border-t pt-4">
                    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">{t('espacos.detalhes.gestores')}</h3>

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
            </CardContent>
        </Card>
    );
}
