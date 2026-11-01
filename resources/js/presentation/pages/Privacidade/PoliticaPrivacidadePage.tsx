import { useTranslation } from '@/i18n';
import GenericHeader from '@/presentation/molecules/GenericHeader';
import AppLayout from '@/presentation/templates/AppLayout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

interface PoliticaPrivacidadePageProps {
    versao: string;
    data_versao: string;
}

const PROJUR_TELEFONE_EXIBICAO = '(77) 3424-8649';
const PROJUR_TELEFONE_HREF = '+557734248649';
const PROJUR_EMAIL = 'projur@uesb.edu.br';
const INSTITUICAO = { instituicao: 'Universidade Estadual do Sudoeste da Bahia (UESB)', sigla: 'UESB' };

const linkClass = 'text-primary font-medium underline-offset-4 hover:underline';

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-2">
            <h2 className="text-foreground text-lg font-semibold">{titulo}</h2>
            {children}
        </section>
    );
}

export default function PoliticaPrivacidadePage({ versao, data_versao }: PoliticaPrivacidadePageProps) {
    const { t, formatDate } = useTranslation();
    const { auth } = usePage<{ auth?: { user?: { id: number } | null } | null }>().props;
    const isAutenticado = Boolean(auth?.user);

    const breadcrumbs = useMemo<BreadcrumbItem[]>(() => [{ title: t('privacidade.title'), href: route('privacidade') }], [t]);

    const conteudo = (
        <>
            <Head title={t('privacidade.title')} />
            <GenericHeader titulo={t('privacidade.title')} />

            <aside className="border-warning-accent bg-warning-subtle flex gap-3 rounded-xl border p-4" aria-labelledby="privacidade-rascunho">
                <AlertTriangle className="text-warning-accent mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="flex flex-col gap-1">
                    <p id="privacidade-rascunho" className="text-foreground font-semibold">
                        {t('privacidade.rascunho_titulo')}
                    </p>
                    <p className="text-foreground text-sm">{t('privacidade.rascunho_texto', INSTITUICAO)}</p>
                </div>
            </aside>

            <p className="text-muted-foreground text-sm">
                {t('privacidade.versao')}: {versao} · {t('privacidade.atualizado_em')}: {formatDate(data_versao, 'dd/MM/yyyy')}
            </p>

            <Secao titulo={t('privacidade.controlador.titulo')}>
                <p className="text-foreground">{t('privacidade.controlador.texto', INSTITUICAO)}</p>
            </Secao>

            <Secao titulo={t('privacidade.encarregado.titulo')}>
                <p className="text-foreground">{t('privacidade.encarregado.texto', INSTITUICAO)}</p>
                <ul className="text-foreground list-disc space-y-1 pl-5">
                    <li>
                        {t('privacidade.encarregado.telefone_label')}:{' '}
                        <a href={`tel:${PROJUR_TELEFONE_HREF}`} className={linkClass}>
                            {PROJUR_TELEFONE_EXIBICAO}
                        </a>
                    </li>
                    <li>
                        {t('privacidade.encarregado.email_label')}:{' '}
                        <a href={`mailto:${PROJUR_EMAIL}`} className={linkClass}>
                            {PROJUR_EMAIL}
                        </a>
                    </li>
                </ul>
                <p className="text-foreground">{t('privacidade.encarregado.campi')}</p>
            </Secao>

            <Secao titulo={t('privacidade.dados.titulo')}>
                <p className="text-foreground">{t('privacidade.dados.texto')}</p>
                <ul className="text-foreground list-disc space-y-1 pl-5">
                    <li>{t('privacidade.dados.item_nome')}</li>
                    <li>{t('privacidade.dados.item_email')}</li>
                    <li>{t('privacidade.dados.item_telefone')}</li>
                    <li>{t('privacidade.dados.item_setor')}</li>
                    <li>{t('privacidade.dados.item_foto')}</li>
                    <li>{t('privacidade.dados.item_reservas')}</li>
                    <li>{t('privacidade.dados.item_logs')}</li>
                </ul>
            </Secao>

            <Secao titulo={t('privacidade.finalidades.titulo')}>
                <p className="text-foreground">{t('privacidade.finalidades.texto')}</p>
                <ul className="text-foreground list-disc space-y-1 pl-5">
                    <li>{t('privacidade.finalidades.conta', INSTITUICAO)}</li>
                    <li>{t('privacidade.finalidades.reservas', INSTITUICAO)}</li>
                    <li>{t('privacidade.finalidades.notificacoes')}</li>
                    <li>{t('privacidade.finalidades.seguranca')}</li>
                </ul>
            </Secao>

            <Secao titulo={t('privacidade.telefone.titulo')}>
                <p className="text-foreground">{t('privacidade.telefone.texto')}</p>
            </Secao>

            <Secao titulo={t('privacidade.agenda.titulo')}>
                <p className="text-foreground">{t('privacidade.agenda.texto')}</p>
            </Secao>

            <Secao titulo={t('privacidade.compartilhamento.titulo')}>
                <p className="text-foreground">{t('privacidade.compartilhamento.texto')}</p>
            </Secao>

            <Secao titulo={t('privacidade.retencao.titulo')}>
                <p className="text-foreground">{t('privacidade.retencao.texto', INSTITUICAO)}</p>
            </Secao>

            <Secao titulo={t('privacidade.direitos.titulo')}>
                <p className="text-foreground">{t('privacidade.direitos.texto')}</p>
                <ul className="text-foreground list-disc space-y-1 pl-5">
                    <li>{t('privacidade.direitos.item_confirmacao')}</li>
                    <li>{t('privacidade.direitos.item_acesso')}</li>
                    <li>{t('privacidade.direitos.item_correcao')}</li>
                    <li>{t('privacidade.direitos.item_anonimizacao')}</li>
                    <li>{t('privacidade.direitos.item_compartilhamento')}</li>
                    <li>{t('privacidade.direitos.item_revogacao')}</li>
                </ul>
                <p className="text-foreground">{t('privacidade.direitos.como_exercer')}</p>
            </Secao>

            <Secao titulo={t('privacidade.decisao.titulo')}>
                <p className="text-foreground">{t('privacidade.decisao.texto')}</p>
            </Secao>
        </>
    );

    if (isAutenticado) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6">{conteudo}</div>
            </AppLayout>
        );
    }

    return (
        <div className="bg-background text-foreground min-h-dvh">
            <header className="border-border border-b">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
                    <span className="font-semibold">UniEspaços</span>
                    <Link href={route('login')} className={linkClass}>
                        {t('privacidade.entrar')}
                    </Link>
                </div>
            </header>
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">{conteudo}</div>
        </div>
    );
}
