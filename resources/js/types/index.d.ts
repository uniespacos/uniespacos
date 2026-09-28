import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';
import type { SupportedLocale } from '@/i18n';
import type {
    SituacaoReservaType,
    SituacaoHorarioType,
    ValidationStatusType,
    TipoRelatorioType,
    FormatoRelatorioType,
    TurnoType,
    ModoArquivoType,
    OrdenacaoReservaType,
    ErrorCodeType,
    RecorrenciaReservaType,
    RoleType,
} from '@/contracts';

export type SituacaoReserva = SituacaoReservaType;
export type SituacaoHorario = SituacaoHorarioType;
export type ValidationStatus = ValidationStatusType;
export type TipoRelatorio = TipoRelatorioType;
export type FormatoRelatorio = FormatoRelatorioType;
export type Turno = TurnoType;
export type ModoArquivo = ModoArquivoType;
export type OrdenacaoReserva = OrdenacaoReservaType;
export type ErrorCode = ErrorCodeType;
export type RecorrenciaReserva = RecorrenciaReservaType;
export type ValorOcorrenciaType = RecorrenciaReservaType;
export type SystemRole = RoleType;

// =============================================================================
// 1. TIPOS GERAIS DA APLICAÇÃO E AUTENTICAÇÃO
// Definições básicas para usuário, autenticação, mensagens e navegação.
// =============================================================================

/**
 * Dados compartilhados pelo Inertia em todas as páginas.
 */
export interface SharedData {
    auth: Auth;
    ziggy: Config & { location: string };
    flash: FlashMessages;
    sidebarOpen: boolean;
    locale?: SupportedLocale;
    name?: string;
    quote?: {
        message: string;
        author: string;
    } | null;
    [key: string]: unknown;
}

/**
 * Estrutura do objeto de autenticação.
 */
export interface Auth {
    user: User;
}

/**
 * Modelo de Usuário, conforme o banco de dados.
 */
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    telefone: string;
    profile_pic?: string;
    roles: string[]; // Array de nomes de roles (ex: ['institucional', 'gestor'])
    permissions: string[]; // Array de nomes de permissões (todas: herdadas via role + diretas)
    direct_permissions?: string[]; // Apenas permissões atribuídas diretamente ao usuário (model_has_permissions)
    setor_id: number | null;
    setor?: Setor; // Opcional, carregar com with('setor')
    agendas?: Agenda[]; // Relação aninhada, array de agendas
    unread_notifications: []; // Adicionado no AppServiceProvider
    created_at: string;
    updated_at: string;
}

/**
 * Modelo de Role (Papel/Função).
 */
export interface Role {
    id: number;
    name: string;
    description: string | null;
    is_system: boolean;
    guard_name: string;
    permissions?: string[]; // Array de nomes de permissões
    users_count?: number; // Contagem de usuários com esta role
    permissions_count?: number; // Contagem de permissões
    created_at: string;
    updated_at: string;
}

/**
 * Modelo de Permission (Permissão).
 */
export interface Permission {
    id: number;
    name: string;
    group: string; // Grupo derivado do prefixo (ex: 'usuarios', 'espacos')
    guard_name: string;
    created_at: string;
    updated_at: string;
}

/**
 * Mensagens de feedback (success, error) enviadas pelo backend.
 */
export interface FlashMessages {
    success?: string;
    error?: string;
    info?: string;
    warning?: string;
}

/**
 * Itens de navegação para a sidebar ou menus.
 */
export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

/**
 * Grupo de itens de navegação.
 */
export interface NavGroup {
    title: string;
    items: NavItem[];
}

/**
 * Item para breadcrumbs de navegação.
 */
export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface ConflictInfo {
    horario_checado_id: number;
    conflito_reserva_titulo: string;
    conflito_user_name: string;
}

// =============================================================================
// 2. TIPOS DA HIERARQUIA DE LOCALIZAÇÃO (MODELOS DO LARAVEL)
// Estrutura física da instituição, em ordem hierárquica.
// =============================================================================

export interface Campus {
    id: number;
    nome: string;
    sigla: string;
    instituicao_id: number;
}

export interface Instituicao {
    id: number;
    nome: string;
    sigla: string;
    endereco: string;
    unidades?: Unidade[]; // Relação aninhada, array de unidades
    setors?: Setor[]; // Relação aninhada, array de setores
}

export interface Unidade {
    id: number;
    nome: string;
    sigla: string;
    instituicao?: Instituicao; // Relação aninhada
    modulos?: Modulo[]; // Relação aninhada, array de módulos
    setors?: Setor[]; // Relação aninhada
}

export interface Setor {
    id: number;
    nome: string;
    sigla: string;
    unidade?: Unidade; // Relação aninhada
    users?: User[]; // Relação aninhada, array de usuários
    users_count?: number;
}

export interface Modulo {
    id: number;
    nome: string;
    unidade?: Unidade; // Relação aninhada
    andars?: Andar[]; // Relação aninhada, array de andares
    unidade_id: number; // Adicionado para facilitar o filtro no frontend
}

export interface Andar {
    id: number;
    nome: string;
    tipo_acesso: [];
    modulo?: Modulo; // Relação aninhada
    modulo_id: number; // Adicionado para facilitar o filtro no frontend
    espacos?: Espaco[]; // Relação aninhada, array de espaços
}

export interface Espaco {
    id: number;
    nome: string;
    capacidade_pessoas: number;
    descricao: string;
    imagens: string[];
    main_image_index: string | null;
    andar?: Andar; // Relação aninhada
    agendas?: Agenda[];
    is_favorited_by_user?: boolean; // Indica se o usuário favoritou este espaço
}

// =============================================================================
// 3. TIPOS DO SISTEMA DE RESERVAS (MODELOS E LÓGICA)
// O coração do sistema: Reservas, Horários, Agendas e seus status.
// =============================================================================

/**
 * Modelo de Agenda, que define turnos e gestores para um Espaço.
 */
export interface Agenda {
    id: number;
    turno: Turno;
    espaco?: Espaco; // Relação aninhada
    user?: User; // Relação com o gestor da agenda
    horarios?: Horario[];
}

/**
 * Modelo de Horário. Contém a referência para a Agenda e os dados da tabela pivô.
 */
export interface Horario {
    id: number;
    data: string; // Datas do Laravel chegam como strings no JSON
    horario_inicio: string;
    horario_fim: string;
    agenda?: Agenda; // Relação aninhada
    reserva?: Reserva;
    situacao: SituacaoHorario;
    justificativa?: string | null; // Justificativa opcional para indeferimento
    user?: User;
    avaliador?: User; // Gestor que avaliou este horário (null enquanto em_analise)
    is_conflicted?: boolean;
    conflict_details?: string;

    // --- NOVOS CAMPOS VINDOS DO BACKEND ---
    validation_status: ValidationStatus;
    // O cache é um objeto onde a chave é o ID do horário (string) e o valor são os detalhes do conflito
    conflict_cache: Record<string, ConflictInfo> | null;
    cache_validated_at: string | null;
}

/**
 * Modelo de Reserva. Esta é a estrutura principal que será usada nas páginas
 * 'minhasReservas' e 'gerenciarReservas', contendo todas as relações aninhadas.
 */
export interface Reserva {
    id: number;
    titulo: string;
    descricao: string;
    situacao: SituacaoReserva; // O status geral da reserva
    data_inicial: Date;
    data_final: Date;
    recorrencia: ValorOcorrenciaType; // Tipo de recorrência da reserva
    observacao: string | null;
    created_at: string;
    updated_at: string;
    user?: User; // O usuário que fez a reserva (carregar com with('usuario'))
    horarios: Horario[]; // O array de horários pertencentes a esta reserva
    can_update?: boolean; // Permissão de edição dinâmica
    validation_status?: ValidationStatus; // Validação de conflitos em segundo plano
}

// =============================================================================
// 4. TIPOS PARA FORMULÁRIOS E DADOS DE PÁGINAS ESPECÍFICAS
// Tipos auxiliares usados em formulários, dashboards, etc.
// =============================================================================

/**
 * Tipo para o formulário de criação/edição de uma reserva.
 */
export interface ReservaFormData {
    titulo: string;
    descricao: string;
    data_inicial: Date | null;
    data_final: Date | null;
    recorrencia: ValorOcorrenciaType; // Tipo de recorrência selecionada
    horarios_solicitados: Partial<Horario>[]; // Horários que o usuário seleciona
    [key: string]: unknown;
}

/**
 * Tipo para o painel de controle que mostra o resumo dos status.
 */
export interface DashboardStatusReservasType {
    em_analise: number;
    parcialmente_deferida: number; // Novo status adicionado
    deferida: number;
    indeferida: number;
}

// =============================================================================
// 5. Tipoas para "View Model"
// Tipos auxiliares usados em construção da interface de usuario, dashboards, etc.
// =============================================================================

export interface SlotCalendario {
    id: string; // ID único gerado para o frontend (ex: "2025-06-13|09:00:00")
    status: 'livre' | 'reservado' | 'selecionado' | 'solicitado' | 'indeferida' | 'deferida'; // Status do slot no calendário
    data: Date;
    horario_inicio: string;
    horario_fim: string;

    // Se o status for 'reservado', conterá os dados originais do backend.
    dadosReserva?: {
        horarioDB: Horario; // O objeto Horario original do banco
        autor: string;
        reserva_titulo: string;
        conflito?: string | null;
    };
    isLocked?: boolean;
    isPast?: boolean;
    // Se o status for 'livre', conterá o ID da agenda para criar uma nova reserva.
    agenda_id?: number;
    isShowReservation?: boolean;
}

export interface OpcoesRecorrencia {
    valor: ValorOcorrenciaType;
    label: string;
    descricao: string;
    calcularDataFinal: (dataInicial: Date) => Date;
}


// Define a estrutura de um único link da paginação do Laravel
interface PaginatorLink {
    url: string | null;
    label: string;
    active: boolean;
}

// Define a estrutura completa do objeto paginador do Laravel
// O <T> o torna genérico, para que possamos usá-lo para Reservas, Espaços, etc.
interface Paginator<T> {
    data: T[];
    links: PaginatorLink[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    per_page: number;
    path: string;
    first_page_url: string;
    last_page_url: string;
    next_page_url: string | null;
    prev_page_url: string | null;
}

export interface ImageWithPreview {
    preview: string; // URL para visualização (blob: ou /storage/...)
    file?: File; // Objeto File para novas imagens
    path?: string; // Path relativo para imagens existentes
}

export interface AgendaGestoresPorTurnoType {
    nome: string;
    email: string;
    departamento: string;
    agenda_id: number;
}

export interface AgendaDiasSemanaType {
    data: Date;
    nome: string;
    abreviado: string;
    diaMes: string;
    valor: string;
    ehHoje: boolean;
}

export type AgendaSlotsDoTurnoType = Record<string, SlotCalendario[]>;
export interface SelectedAgenda {
    agenda: Agenda;
    espaco: Espaco;
    andar: Andar;
    modulo: Modulo;
    unidade: Unidade;
    instituicao: Instituicao;
}

interface ReservaAvaliadaNotificationPayload {
    type: string; // 'App\\Notifications\\ReservaAvaliadaNotification'
    reserva_id: number;
    status_avaliacao: string;
    mensagem: string;
    url: string;
}

export interface FiltrosRelatorio {
    data_inicio?: string;
    data_fim?: string;
    situacoes?: SituacaoReserva[];
    turnos?: Turno[];
    unidade_id?: number;
    modulo_id?: number;
    andar_id?: number;
    espaco_id?: number;
    setor_id?: number;
}

export interface TipoRelatorioOption {
    value: TipoRelatorio;
    label: string;
}

export interface OpcoesInventario {
    unidades: { id: number; nome: string }[];
    modulos: { id: number; nome: string; unidade_id: number }[];
    andares: { id: number; nome: string; modulo_id: number }[];
    espacos: { id: number; nome: string; andar_id: number }[];
}

export interface ColunaRelatorio {
    chave: string;
    rotulo: string;
    tipo: string;
    largura: number;
}

export interface DadosRelatorio {
    tipo: TipoRelatorio;
    titulo: string;
    subtitulo: string;
    colunas: ColunaRelatorio[];
    linhas: Record<string, unknown>[];
    sumario: Record<string, unknown>;
    filtrosAplicados: Record<string, unknown>;
    geradoPor: string;
    geradoEm: string;
}
