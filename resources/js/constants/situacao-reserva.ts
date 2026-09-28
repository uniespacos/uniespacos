import { SituacaoReserva, type SituacaoReservaType } from '@/contracts/situacao-reserva.contract';

export * from '@/contracts/situacao-reserva.contract';

/**
 * Estilo visual de cada situação de reserva, em um lugar só.
 *
 * Utiliza tokens semânticos Catppuccin sob Tailwind v4 para garantir contraste
 * e suporte nativo a modo claro e escuro.
 */
export interface EstiloSituacao {
    /** Rótulo em português, já acentuado. */
    label: string;
    /** Preenchimento pálido + texto de contraste, para badges. */
    badge: string;
    /** Tom sólido, para pontos e faixas de status. */
    solido: string;
    /** Preenchimento de célula do calendário. */
    celula: string;
}

export const ESTILO_SITUACAO: Record<SituacaoReservaType, EstiloSituacao> = {
    [SituacaoReserva.EM_ANALISE]: {
        label: 'Em Análise',
        badge: 'border-warning-accent/30 bg-warning-subtle text-warning-accent',
        solido: 'bg-warning',
        celula: 'border-warning-accent/30 bg-warning-subtle',
    },
    [SituacaoReserva.PARCIALMENTE_DEFERIDA]: {
        label: 'Parcialmente Deferida',
        badge: 'border-info-accent/30 bg-info-subtle text-info-accent',
        solido: 'bg-info',
        celula: 'border-info-accent/30 bg-info-subtle',
    },
    [SituacaoReserva.DEFERIDA]: {
        label: 'Deferida',
        badge: 'border-success-accent/30 bg-success-subtle text-success-accent',
        solido: 'bg-success',
        celula: 'border-success-accent/30 bg-success-subtle',
    },
    [SituacaoReserva.INDEFERIDA]: {
        label: 'Indeferida',
        badge: 'border-destructive-accent/30 bg-destructive-subtle text-destructive-accent',
        solido: 'bg-destructive',
        celula: 'border-destructive-accent/30 bg-destructive-subtle',
    },
    [SituacaoReserva.INATIVA]: {
        label: 'Inativa / Cancelada',
        badge: 'border-neutral-accent/30 bg-neutral-subtle text-neutral-accent',
        solido: 'bg-neutral-accent',
        celula: 'border-neutral-accent/30 bg-neutral-subtle',
    },
};

/**
 * Estado do slot no calendário. Não é a mesma coisa que a situação da reserva:
 * um slot pode estar `livre` ou `reservado` por terceiro, que não são
 * situações de reserva nenhuma.
 */
export const ESTILO_SLOT = {
    livre: { label: 'Livre', solido: 'bg-muted-foreground/25', fundo: '' },
    reservado: { label: 'Reservado', solido: 'bg-info', fundo: 'bg-info-subtle' },
    selecionado: { label: 'Selecionado', solido: 'bg-success', fundo: 'bg-success-subtle' },
    solicitado: { label: 'Em análise', solido: 'bg-warning', fundo: 'bg-warning-subtle' },
    deferida: { label: 'Deferida', solido: 'bg-success', fundo: 'bg-success-subtle' },
    indeferida: { label: 'Indeferida', solido: 'bg-destructive', fundo: 'bg-destructive-subtle' },
} as const;
