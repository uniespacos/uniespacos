import {
    ErrorCode,
    FormatoRelatorio,
    MODO_ARQUIVO_DEFAULT,
    ModoArquivo,
    OPCOES_RECORRENCIA_VALORES,
    ORDENACAO_RESERVA_DEFAULT,
    OrdenacaoReserva,
    ROLES_VALIDAS,
    RecorrenciaReserva,
    SITUACOES_DE_AVALIACAO,
    SituacaoHorario,
    SituacaoReserva,
    SystemRole,
    TURNOS_ORDENADOS,
    TipoRelatorio,
    Turno,
    ValidationStatus,
} from './index';

describe('Contratos SSOT Frontend', () => {
    describe('SituacaoReserva e SituacaoHorario', () => {
        it('deve conter todos os status esperados de reserva', () => {
            expect(SituacaoReserva).toEqual({
                EM_ANALISE: 'em_analise',
                INDEFERIDA: 'indeferida',
                PARCIALMENTE_DEFERIDA: 'parcialmente_deferida',
                DEFERIDA: 'deferida',
                INATIVA: 'inativa',
            });
        });

        it('deve mapear SituacaoHorario para os mesmos valores de SituacaoReserva', () => {
            expect(SituacaoHorario.EM_ANALISE).toBe(SituacaoReserva.EM_ANALISE);
            expect(SituacaoHorario.INDEFERIDA).toBe(SituacaoReserva.INDEFERIDA);
            expect(SituacaoHorario.DEFERIDA).toBe(SituacaoReserva.DEFERIDA);
            expect(SituacaoHorario.INATIVA).toBe(SituacaoReserva.INATIVA);
        });

        it('deve expor SITUACOES_DE_AVALIACAO excluindo inativa', () => {
            expect(SITUACOES_DE_AVALIACAO).toEqual([
                SituacaoReserva.EM_ANALISE,
                SituacaoReserva.PARCIALMENTE_DEFERIDA,
                SituacaoReserva.DEFERIDA,
                SituacaoReserva.INDEFERIDA,
            ]);
            expect(SITUACOES_DE_AVALIACAO).not.toContain(SituacaoReserva.INATIVA);
        });
    });

    describe('ModoArquivo', () => {
        it('deve conter todos os modos de arquivo e default correto', () => {
            expect(ModoArquivo).toEqual({
                ATIVAS: 'ativas',
                ARQUIVADAS: 'arquivadas',
                TODAS: 'todas',
            });
            expect(MODO_ARQUIVO_DEFAULT).toBe(ModoArquivo.ATIVAS);
        });
    });

    describe('OrdenacaoReserva', () => {
        it('deve conter todas as opções de ordenação e default correto', () => {
            expect(OrdenacaoReserva).toEqual({
                DATA_SOLICITACAO: 'data_solicitacao',
                SITUACAO: 'situacao',
            });
            expect(ORDENACAO_RESERVA_DEFAULT).toBe(OrdenacaoReserva.DATA_SOLICITACAO);
        });
    });

    describe('ValidationStatus', () => {
        it('deve conter todos os status de validação de conflito assíncrono', () => {
            expect(ValidationStatus).toEqual({
                PENDING: 'pending',
                PROCESSING: 'processing',
                COMPLETED: 'completed',
                FAILED: 'failed',
            });
        });
    });

    describe('ErrorCode', () => {
        it('deve conter todos os códigos padronizados da API', () => {
            expect(ErrorCode).toEqual({
                UNAUTHENTICATED: 'UNAUTHENTICATED',
                FORBIDDEN: 'FORBIDDEN',
                NOT_FOUND: 'NOT_FOUND',
                METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
                PAGE_EXPIRED: 'PAGE_EXPIRED',
                VALIDATION_FAILED: 'VALIDATION_FAILED',
                TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
                BAD_REQUEST: 'BAD_REQUEST',
                SERVER_ERROR: 'SERVER_ERROR',
            });
        });
    });

    describe('Relatórios', () => {
        it('deve conter todos os tipos de relatórios analíticos', () => {
            expect(TipoRelatorio).toEqual({
                RESERVAS_PERIODO: 'reservas_periodo',
                OCUPACAO_ESPACOS: 'ocupacao_espacos',
                INVENTARIO_ESPACOS: 'inventario_espacos',
                INDICADORES_CONSOLIDADOS: 'indicadores_consolidados',
            });
        });

        it('deve conter todos os formatos de exportação suportados', () => {
            expect(FormatoRelatorio).toEqual({
                PDF: 'pdf',
                CSV: 'csv',
                XLSX: 'xlsx',
            });
        });
    });

    describe('RecorrenciaReserva', () => {
        it('deve conter todos os modos de recorrência', () => {
            expect(RecorrenciaReserva).toEqual({
                UNICA: 'unica',
                QUINZE_DIAS: '15dias',
                UM_MES: '1mes',
                PERSONALIZADO: 'personalizado',
            });
            expect(OPCOES_RECORRENCIA_VALORES).toEqual([
                RecorrenciaReserva.UNICA,
                RecorrenciaReserva.QUINZE_DIAS,
                RecorrenciaReserva.UM_MES,
                RecorrenciaReserva.PERSONALIZADO,
            ]);
        });
    });

    describe('Turno', () => {
        it('deve conter turnos ordenados', () => {
            expect(Turno).toEqual({
                MANHA: 'manha',
                TARDE: 'tarde',
                NOITE: 'noite',
            });
            expect(TURNOS_ORDENADOS).toEqual([Turno.MANHA, Turno.TARDE, Turno.NOITE]);
        });
    });

    describe('SystemRole', () => {
        it('deve conter os papéis do sistema e lista válida', () => {
            expect(SystemRole).toEqual({
                INSTITUCIONAL: 'institucional',
                GESTOR: 'gestor',
                COMUM: 'comum',
            });
            expect(ROLES_VALIDAS).toEqual([SystemRole.INSTITUCIONAL, SystemRole.GESTOR, SystemRole.COMUM]);
        });
    });
});
