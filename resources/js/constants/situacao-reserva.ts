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
export interface EstiloSlot {
    /** Tom sólido, para a faixa lateral e o marcador da legenda. */
    solido: string;
    /** Preenchimento da célula. */
    fundo: string;
    /** Cor da borda esquerda da célula. */
    borda: string;
    /** Cor do texto de status dentro da célula. */
    texto: string;
}

export const ESTILO_SLOT = {
    livre: { solido: 'bg-muted-foreground/25', fundo: '', borda: '', texto: '' },
    reservado: { solido: 'bg-info', fundo: 'bg-info-subtle', borda: 'border-info-accent/30', texto: 'text-info-accent' },
    selecionado: { solido: 'bg-primary', fundo: 'bg-primary/15', borda: 'border-primary', texto: 'text-primary' },
    solicitado: { solido: 'bg-warning', fundo: 'bg-warning-subtle', borda: 'border-warning-accent/30', texto: 'text-warning-accent' },
    deferida: { solido: 'bg-success', fundo: 'bg-success-subtle', borda: 'border-success-accent/30', texto: 'text-success-accent' },
    indeferida: { solido: 'bg-destructive', fundo: 'bg-destructive-subtle', borda: 'border-destructive-accent/30', texto: 'text-destructive-accent' },
} as const satisfies Record<string, EstiloSlot>;
