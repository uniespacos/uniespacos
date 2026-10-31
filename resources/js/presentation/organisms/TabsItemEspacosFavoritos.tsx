import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/i18n';
import EspacoCard from '@/presentation/organisms/EspacoCard';
import { type Espaco, type User } from '@/types';
import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';

declare function route(name: string, params?: unknown): string;

export default function TabsItemEspacosFavoritos({
    espacosFiltrados,
    searchTerm,
    setSearchTerm,
    user,
}: {
    user: User;
    espacosFiltrados: Espaco[];
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}) {
    const { t } = useTranslation();

    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle>{t('dashboard.tabs.favoritos')}</CardTitle>
                <CardDescription>{t('espacos.favoritos_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                            placeholder={t('common.actions.search')}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                            }}
                            className="pr-9 pl-9"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                }}
                                aria-label={t('common.actions.clear')}
                                className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                {espacosFiltrados.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {espacosFiltrados.map((espaco) => (
                            <EspacoCard
                                key={espaco.id}
                                espaco={espaco}
                                user={user}
                                handleSolicitarReserva={() => {
                                    router.get(route('espacos.show', espaco.id));
                                }}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-8 text-center text-sm">
                        <p>{t('common.empty.noResults')}</p>
                        {searchTerm && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm('');
                                }}
                            >
                                {t('common.actions.clear')}
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
