import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

export interface PasswordInputProps extends Omit<React.ComponentProps<typeof Input>, 'type'> {
    hasError?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ className, hasError, disabled, ...props }, ref) => {
    const { t } = useTranslation();
    const [showPassword, setShowPassword] = React.useState(false);

    return (
        <div className="relative w-full">
            <Input
                {...props}
                ref={ref}
                type={showPassword ? 'text' : 'password'}
                disabled={disabled}
                className={cn('pr-10', hasError && 'border-destructive focus-visible:ring-destructive', className)}
            />
            <button
                type="button"
                disabled={disabled}
                aria-pressed={showPassword}
                aria-label={showPassword ? t('auth.login.hide_password') : t('auth.login.show_password')}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex items-center rounded-r-md pr-3 transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:opacity-50"
                onClick={() => {
                    setShowPassword((prev) => !prev);
                }}
            >
                {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
        </div>
    );
});

PasswordInput.displayName = 'PasswordInput';
