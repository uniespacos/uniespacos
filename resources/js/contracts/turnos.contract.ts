export const Turno = {
    MANHA: 'manha',
    TARDE: 'tarde',
    NOITE: 'noite',
} as const;

export type TurnoType = (typeof Turno)[keyof typeof Turno];

export const TURNOS_ORDENADOS: readonly TurnoType[] = [Turno.MANHA, Turno.TARDE, Turno.NOITE] as const;
