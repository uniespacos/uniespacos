import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SearchFilterProps {
    searchTerm: string;
    onSearchTermChange: (value: string) => void;
    placeholder: string;
    variant?: 'card' | 'plain';
}

export function SearchFilter({ searchTerm, onSearchTermChange, placeholder, variant = 'plain' }: SearchFilterProps) {
    const field = (
        <div className="space-y-2">
            <Label className="text-sm font-medium">Buscar</Label>
            <Input
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
