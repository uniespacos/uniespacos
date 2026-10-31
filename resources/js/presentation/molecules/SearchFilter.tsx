import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n';
import { useId } from 'react';

interface SearchFilterProps {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    placeholder: string;
    variant?: 'card' | 'plain';
}

export function SearchFilter({ searchTerm, onSearchTermChange, placeholder, variant = 'plain' }: SearchFilterProps) {
    const { t } = useTranslation();
    const inputId = useId();

    const field = (
        <div className="space-y-2">
            <Label htmlFor={inputId} className="text-sm font-medium">
                {t('common.a11y.search')}
            </Label>
            <Input
                id={inputId}
                type="search"
                placeholder={placeholder}
                className="w-full pl-8"
                value={searchTerm}
                onChange={(e) => {
                    onSearchTermChange(e.target.value);
                }}
            />
        </div>
    );

    if (variant === 'card') {
        return (
            <Card>
                <CardContent className="space-y-2">{field}</CardContent>
            </Card>
        );
    }

    return <div className="flex flex-col gap-4 sm:flex-row">{field}</div>;
}
