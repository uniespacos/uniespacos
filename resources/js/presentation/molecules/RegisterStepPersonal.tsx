import { Input } from '@/components/ui/input';
import { FormField } from '@/presentation/molecules/FormField';
import { useTranslation } from '@/i18n';
import type React from 'react';

interface RegisterStepPersonalProps {
    data: {
        name: string;
        email: string;
        phone: string;
    };
    onInputChange: (field: string, value: string) => void;
    errors: Record<string, string>;
    processing: boolean;
}

export function RegisterStepPersonal({ data, onInputChange, errors, processing }: RegisterStepPersonalProps) {
    const { t } = useTranslation();

    const formatPhoneNumber = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        const limited = cleaned.slice(0, 11);

        if (limited.length <= 2) {
            return `(${limited}`;
        } else if (limited.length <= 6) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
        } else if (limited.length <= 10) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6, 10)}`;
        } else {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7, 11)}`;
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        onInputChange('phone', formatted);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField label={t('auth.register.name')} htmlFor="name" error={errors.name} required>
                    <Input
                        id="name"
                        name="name"
                        autoComplete="name"
                        value={data.name}
                        onChange={(e) => {
                            onInputChange('name', e.target.value);
                        }}
                        placeholder={t('auth.register.step_personal_name_placeholder')}
                        required
                        disabled={processing}
                        className="h-11"
                        autoFocus
                    />
                </FormField>

                <FormField label={t('auth.register.email')} htmlFor="email" error={errors.email} required>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={data.email}
                        onChange={(e) => {
                            onInputChange('email', e.target.value);
                        }}
                        placeholder={t('auth.register.step_personal_email_placeholder')}
                        required
                        disabled={processing}
                        className="h-11"
                    />
                </FormField>
            </div>

            <FormField label={t('auth.register.telefone')} htmlFor="phone" error={errors.phone}>
                <Input
                    id="phone"
                    name="tel"
                    type="tel"
                    autoComplete="tel"
                    value={data.phone}
                    onChange={handlePhoneChange}
                    placeholder={t('auth.register.step_personal_phone_placeholder')}
                    maxLength={15}
                    disabled={processing}
                    className="h-11"
                />
            </FormField>
        </div>
    );
}
