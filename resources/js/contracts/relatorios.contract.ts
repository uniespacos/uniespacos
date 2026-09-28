export const TipoRelatorio = {
    RESERVAS_PERIODO: 'reservas_periodo',
    OCUPACAO_ESPACOS: 'ocupacao_espacos',
    INVENTARIO_ESPACOS: 'inventario_espacos',
    INDICADORES_CONSOLIDADOS: 'indicadores_consolidados',
} as const;

export type TipoRelatorioType = (typeof TipoRelatorio)[keyof typeof TipoRelatorio];

export const FormatoRelatorio = {
    PDF: 'pdf',
    CSV: 'csv',
    XLSX: 'xlsx',
} as const;

export type FormatoRelatorioType = (typeof FormatoRelatorio)[keyof typeof FormatoRelatorio];
