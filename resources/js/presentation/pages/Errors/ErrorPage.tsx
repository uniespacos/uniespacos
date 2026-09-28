import { Button } from '@/components/ui/button';
import { ErrorCode, type ErrorCodeType } from '@/contracts';
import { useTranslation, type TranslationKey } from '@/i18n';
import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Clock, Lock, SearchX, ServerCrash, TriangleAlert } from 'lucide-react';
import { ComponentType } from 'react';

declare function route(name: string, params?: unknown): string;

interface ErrorPageProps {
    status: number;
}

interface ErrorContentDef {
    tituloKey: TranslationKey;
    descricaoKey: TranslationKey;
    Icone: ComponentType<{ className?: string }>;
}

export const HTTP_STATUS_TO_ERROR_CODE: Readonly<Partial<Record<number, ErrorCodeType>>> = {
    400: ErrorCode.BAD_REQUEST,
    401: ErrorCode.UNAUTHENTICATED,
    403: ErrorCode.FORBIDDEN,
    404: ErrorCode.NOT_FOUND,
    405: ErrorCode.METHOD_NOT_ALLOWED,
    419: ErrorCode.PAGE_EXPIRED,
    422: ErrorCode.VALIDATION_FAILED,
    429: ErrorCode.TOO_MANY_REQUESTS,
    500: ErrorCode.SERVER_ERROR,
    503: ErrorCode.SERVER_ERROR,
} as const;

export const CONTEUDO_POR_CODIGO: Readonly<Record<ErrorCodeType, ErrorContentDef>> = {
    [ErrorCode.BAD_REQUEST]: {
        tituloKey: 'errors.bad_request_title',
        descricaoKey: 'errors.bad_request_desc',
        Icone: TriangleAlert,
    },
    [ErrorCode.UNAUTHENTICATED]: {
        tituloKey: 'errors.unauthenticated_title',
        descricaoKey: 'errors.unauthenticated_desc',
        Icone: Lock,
    },
    [ErrorCode.FORBIDDEN]: {
        tituloKey: 'errors.forbidden_title',
        descricaoKey: 'errors.forbidden_desc',
        Icone: Lock,
    },
    [ErrorCode.NOT_FOUND]: {
        tituloKey: 'errors.not_found_title',
        descricaoKey: 'errors.not_found_desc',
        Icone: SearchX,
    },
    [ErrorCode.METHOD_NOT_ALLOWED]: {
        tituloKey: 'errors.method_not_allowed_title',
        descricaoKey: 'errors.method_not_allowed_desc',
        Icone: TriangleAlert,
    },
    [ErrorCode.PAGE_EXPIRED]: {
        tituloKey: 'errors.page_expired_title',
        descricaoKey: 'errors.page_expired_desc',
        Icone: Clock,
    },
    [ErrorCode.VALIDATION_FAILED]: {
        tituloKey: 'errors.validation_failed_title',
        descricaoKey: 'errors.validation_failed_desc',
        Icone: TriangleAlert,
    },
    [ErrorCode.TOO_MANY_REQUESTS]: {
        tituloKey: 'errors.too_many_requests_title',
        descricaoKey: 'errors.too_many_requests_desc',
        Icone: Clock,
    },
    [ErrorCode.SERVER_ERROR]: {
        tituloKey: 'errors.server_error_title',
        descricaoKey: 'errors.server_error_desc',
        Icone: ServerCrash,
    },
} as const;

const CONTEUDO_POR_STATUS: Readonly<Partial<Record<number, ErrorContentDef>>> = {
    503: {
        tituloKey: 'errors.service_unavailable_title',
        descricaoKey: 'errors.service_unavailable_desc',
        Icone: TriangleAlert,
    },
};

const CONTEUDO_PADRAO: ErrorContentDef = {
    tituloKey: 'errors.default_title',
    descricaoKey: 'errors.default_desc',
    Icone: TriangleAlert,
};

export default function ErrorPage({ status }: ErrorPageProps) {
    const { t } = useTranslation();
    const errorCode = HTTP_STATUS_TO_ERROR_CODE[status];
    const { tituloKey, descricaoKey, Icone } = CONTEUDO_POR_STATUS[status] ?? (errorCode !== undefined ? CONTEUDO_POR_CODIGO[errorCode] : CONTEUDO_PADRAO);

    const titulo = t(tituloKey);
    const descricao = t(descricaoKey);

    return (
        <>
            <Head title={titulo} />

            <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12 text-center">
                <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                    <Icone className="text-muted-foreground h-8 w-8" />
                </div>

                <div className="space-y-2">
                    <p className="text-muted-foreground text-sm font-medium tracking-widest">{t('errors.error_code', { code: String(status) })}</p>
                    <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
                    <p className="text-muted-foreground mx-auto max-w-md text-sm">{descricao}</p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            window.history.back();
                        }}
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" /> {t('common.actions.back')}
                    </Button>
                    <Button
                        onClick={() => {
                            router.get(route('dashboard'));
                        }}
                    >
                        {t('errors.ir_painel')}
                    </Button>
                </div>
            </div>
        </>
    );
}
