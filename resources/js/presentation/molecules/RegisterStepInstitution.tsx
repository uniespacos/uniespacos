import { SeletorInstituicao } from '@/presentation/molecules/SeletorInstituicao';
import { useTranslation } from '@/i18n';
import type { Instituicao } from '@/types';

interface RegisterStepInstitutionProps {
    instituicaos: Instituicao[];
    processing: boolean;
    onInstituicaoChange: (instituicaoId: string) => void;
    onSetorChange: (setorId: string) => void;
    errors: Record<string, string>;
}

export function RegisterStepInstitution({ instituicaos, processing, onInstituicaoChange, onSetorChange, errors }: RegisterStepInstitutionProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h3 className="text-foreground text-base font-semibold">{t('auth.register.step_institution_title')}</h3>
                <p className="text-muted-foreground text-xs">{t('auth.register.step_institution_desc')}</p>
            </div>
            <SeletorInstituicao
                instituicaos={instituicaos}
                processing={processing}
                onInstituicaoChange={onInstituicaoChange}
                onSetorChange={onSetorChange}
                errors={errors}
            />
        </div>
    );
}
