export interface AndarFormData {
    id: string;
    nome: string;
    nivel: number;
    tipo_acesso: string[];
    [key: string]: string | number | string[];
}

export interface CadastrarModuloForm {
    nome: string;
    unidade_id: string;
    andares: AndarFormData[];
    [key: string]: string | AndarFormData[];
}

export interface FormCadastroValues {
    nome: string;
    capacidade_pessoas: number | undefined;
    descricao: string;
    imagens: File[];
    main_image_index: number | undefined;
    unidade_id: number | undefined;
    modulo_id: number | undefined;
    andar_id: number | undefined;
    images_to_delete?: string[];
    [key: string]: string | number | File[] | string[] | undefined;
}

export interface CadastrarInstituicaoForm {
    nome: string;
    sigla: string;
    endereco: string;
    [key: string]: string;
}

export interface CadastrarUnidadeForm {
    nome: string;
    sigla: string;
    instituicao_id: string;
    [key: string]: string;
}
