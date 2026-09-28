import { cn } from '@/lib/utils';
import { type HTMLAttributes } from 'react';

export default function InputError({ message, className = '', ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p role="alert" aria-live="polite" {...props} className={cn('text-destructive-accent text-sm', className)}>
            {message}
        </p>
    ) : null;
}
