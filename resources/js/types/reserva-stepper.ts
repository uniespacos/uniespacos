import { Horario, ValorOcorrenciaType } from '@/types';

export type ReservaStepId = 'horarios_recorrencia' | 'dados_justificativa' | 'revisao_confirmacao';

export interface StepperStep {
    id: ReservaStepId;
    title: string;
    description: string;
    iconName?: string;
    isCompleted: boolean;
    isValid: boolean;
}

export interface SlotReservaItem {
    id?: string;
    data: string; // YYYY-MM-DD
    horario_inicio: string; // HH:mm:ss ou HH:mm
    horario_fim: string; // HH:mm:ss ou HH:mm
    agenda_id?: number;
    turno?: string;
}

export interface ReservaFormData {
    espaco_id?: number;
    titulo: string;
    descricao: string;
    justificativa?: string;
    publico_estimado?: number | string;
    categoria?: string;
    recorrencia: ValorOcorrenciaType;
    data_inicial?: Date | null;
    data_final?: Date | null;
    edit_scope?: 'single' | 'recurring';
    edited_week_date?: string;
    slots?: SlotReservaItem[];
    horarios_solicitados:
        | Partial<Horario>[]
        | {
              data: string;
              horario_inicio: string;
              horario_fim: string;
              agenda_id?: number;
          }[];
    termo_responsabilidade?: boolean;
    [key: string]: unknown;
}

export interface PreflightConflictResult {
    hasConflict: boolean;
    conflictingDates: string[];
    conflictingMessage?: string;
    conflictingSlots?: string[];
}
