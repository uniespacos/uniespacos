export const ValidationStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
} as const;

export type ValidationStatusType = (typeof ValidationStatus)[keyof typeof ValidationStatus];
