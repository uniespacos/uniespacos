import { type EscopoRecorrenciaType } from '@/contracts';
import { Horario, ValorOcorrenciaType } from '@/types';

export type ReservaStepId = 'detalhes' | 'revisao';

export type CampoErroEtapa = 'slots' | 'data_inicial' | 'data_final' | 'titulo' | 'descricao' | 'publico_estimado' | 'termo_responsabilidade';

export type ErrosEtapa = Partial<Record<CampoErroEtapa, string>>;

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
    publico_estimado?: number | string | null;
    categoria?: string | null;
    recorrencia: ValorOcorrenciaType;
    data_inicial?: Date | null;
    data_final?: Date | null;
    edit_scope?: EscopoRecorrenciaType;
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
