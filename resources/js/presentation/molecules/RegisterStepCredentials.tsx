import { FormField } from '@/presentation/molecules/FormField';
import { PasswordStrengthMeter } from '@/presentation/molecules/PasswordStrengthMeter';
import { PasswordInput } from '@/presentation/atoms/PasswordInput';
import { useTranslation } from '@/i18n';

interface RegisterStepCredentialsProps {
    data: {
        password: string;
        password_confirmation: string;
    };
    onInputChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    processing: boolean;
}

export function RegisterStepCredentials({ data, onInputChange, errors, processing }: RegisterStepCredentialsProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <div className="mb-4">
                <h3 className="text-foreground text-base font-semibold">{t('auth.register.step_credentials_title')}</h3>
                <p className="text-muted-foreground text-xs">{t('auth.register.step_credentials_desc')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label={t('auth.register.password')} htmlFor="password" error={errors.password} required>
                    <PasswordInput
                        id="password"
                        name="password"
                        autoComplete="new-password"
                        value={data.password}
                        onChange={(e) => {
                            onInputChange('password', e.target.value);
                        }}
                        placeholder={t('auth.register.step_credentials_password_placeholder')}
                        required
                        hasError={!!errors.password}
                        aria-invalid={!!errors.password}
                        aria-describedby={errors.password ? 'register-password-error' : undefined}
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>

                <FormField
                    label={t('auth.register.password_confirmation')}
                    htmlFor="password_confirmation"
                    error={errors.password_confirmation}
                    required
                >
                    <PasswordInput
                        id="password_confirmation"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={data.password_confirmation}
                        onChange={(e) => {
                            onInputChange('password_confirmation', e.target.value);
                        }}
                        placeholder={t('auth.register.step_credentials_confirm_placeholder')}
                        required
                        hasError={!!errors.password_confirmation}
                        aria-invalid={!!errors.password_confirmation}
                        aria-describedby={errors.password_confirmation ? 'register-confirm-error' : undefined}
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>
            </div>

            <PasswordStrengthMeter password={data.password} className="mt-2" />
        </div>
    );
}
