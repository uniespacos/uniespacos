import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';

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
                aria-label={showPassword ? t('auth.login.hide_password') : t('auth.login.show_password')}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 transition-colors focus:outline-none disabled:opacity-50"
                onClick={() => {
                    setShowPassword((prev) => !prev);
                }}
                tabIndex={-1}
            >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
});

PasswordInput.displayName = 'PasswordInput';
