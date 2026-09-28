import { Link } from '@inertiajs/react';
import { CalendarCheck, ShieldCheck } from 'lucide-react';
import { type PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

interface AuthLayoutProps {
    title?: string;
    description?: string;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function AuthSplitLayout({ children, title, description, maxWidth = 'md' }: PropsWithChildren<AuthLayoutProps>) {
    const { t } = useTranslation();
    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];

    return (
        <div className="bg-background relative grid min-h-dvh flex-col items-stretch justify-center lg:max-w-none lg:grid-cols-12">
            {/* Coluna Institucional (Desktop) */}
            <div className="bg-brand-blue-darkest dark:border-border relative hidden h-full flex-col justify-center overflow-hidden p-10 text-white lg:col-span-5 lg:flex xl:col-span-4 dark:border-r">
                {/* Efeito de iluminação suave em degradê — com animação de gradient shift */}
                <div className="from-primary/20 animate-gradient-shift pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-black/40" />
                <div className="bg-primary/15 pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl" />
                <div className="bg-info/10 pointer-events-none absolute -right-24 -bottom-24 h-96 w-96 rounded-full blur-3xl" />

                {/* Bloco Centralizado: Logo + Conteúdo — entrada escalonada */}
                <div className="relative z-20 flex flex-col items-center gap-8">
                    {/* Logo */}
                    <Link
                        href={route('home')}
                        className="animate-fade-in-up animation-delay-100 flex items-center gap-3 transition-opacity hover:opacity-90"
                    >
                        <div className="bg-brand-surface flex size-48 items-center justify-center rounded-xl p-4 shadow-lg lg:size-56 xl:size-64">
                            <img src="/images/uniespacos-logo.png" alt="UniEspaços" className="size-full object-contain" />
                        </div>
                    </Link>

                    {/* Parágrafo Descritivo */}
                    <div className="animate-fade-in-up animation-delay-200 w-full space-y-2 text-center">
                        <p className="text-sm leading-relaxed text-white/80">
                            Agilize a solicitação e o acompanhamento de salas, auditórios, laboratórios e quadras em todos os campi.
                        </p>
                    </div>

                    {/* Card de Destaques */}
                    <div className="animate-fade-in-up animation-delay-300 w-full space-y-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm">
                        <div className="flex items-start gap-3 text-xs text-white/90">
                            <CalendarCheck className="text-success-accent mt-0.5 size-4 shrink-0" />
                            <span>Grade de horários em tempo real e sem conflitos.</span>
                        </div>
                        <div className="flex items-start gap-3 text-xs text-white/90">
                            <ShieldCheck className="text-info-accent mt-0.5 size-4 shrink-0" />
                            <span>Validação institucional e autorização descentralizada.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coluna do Formulário */}
            <div className="flex flex-col justify-center overflow-y-auto px-6 py-10 sm:px-10 lg:col-span-7 lg:px-12 xl:col-span-8">
                <div className={cn('mx-auto flex w-full flex-col justify-center space-y-6', maxWidthClass)}>
                    {/* Header para Mobile */}
                    <div className="animate-fade-in-up flex flex-col items-center justify-center gap-3 lg:hidden">
                        <Link href={route('home')} className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
                            <div className="bg-brand-surface flex size-16 items-center justify-center rounded-xl p-1.5 shadow-md">
                                <img src="/images/uniespacos-logo.png" alt="UniEspaços" className="size-full object-contain" />
                            </div>
                        </Link>
                        <p className="text-muted-foreground max-w-xs text-center text-xs">{t('auth.layout.mobile_tagline')}</p>
                    </div>

                    {/* Cabeçalho da Tela — com animação de entrada */}
                    {(title ?? description) && (
                        <div className="animate-fade-in-up animation-delay-200 flex flex-col space-y-1.5 text-center sm:text-left">
                            {title && <h1 className="text-foreground text-2xl font-bold tracking-tight">{title}</h1>}
                            {description && <p className="text-muted-foreground text-sm text-balance">{description}</p>}
                        </div>
                    )}

                    {/* Conteúdo do Formulário — com animação de entrada */}
                    <div className="animate-fade-in-up animation-delay-300">{children}</div>
                </div>
            </div>
        </div>
    );
}
