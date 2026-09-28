import { Turno, type TurnoType } from '@/contracts/turnos.contract';

export * from '@/contracts/turnos.contract';
export type { TurnoType as Turno };

export const HORARIOS_PADRAO: Record<TurnoType, readonly string[]> = {
    [Turno.MANHA]: ['07:30 - 08:20', '08:20 - 09:10', '09:10 - 10:00', '10:10 - 11:00', '11:00 - 11:50', '11:50 - 12:40'],
    [Turno.TARDE]: ['13:10 - 14:00', '14:00 - 14:50', '14:50 - 15:40', '15:50 - 16:40', '16:40 - 17:30', '17:30 - 18:20'],
    [Turno.NOITE]: ['18:20 - 19:10', '19:10 - 20:00', '20:00 - 20:50', '20:50 - 21:40', '21:40 - 22:30'],
} as const;

export const TURNO_LABEL: Record<TurnoType, string> = {
    [Turno.MANHA]: 'Manhã',
    [Turno.TARDE]: 'Tarde',
    [Turno.NOITE]: 'Noite',
};
