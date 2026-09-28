import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Building2, Layers, Settings, Users } from 'lucide-react';

export default function Home() {
    return (
        <div className="container mx-auto max-w-5xl px-4 py-8">
            <Head title="Painel Administrativo" />
            <div className="mb-10 space-y-3 text-center">
                <Badge variant="secondary" className="px-3 py-1 text-xs">
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Gestão Organizacional
                </Badge>
                <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">Sistema de Gestão Organizacional</h1>
                <p className="text-muted-foreground mx-auto max-w-2xl text-base">
                    Gerencie instituições, unidades e setores de forma integrada na estrutura da UESB.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="border-border/70 group hover:border-primary/50 transition-all duration-200 hover:shadow-md">
                    <CardHeader className="p-6 pb-4">
                        <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-2 w-fit rounded-xl p-3 transition-colors">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-lg font-semibold">Setores</CardTitle>
                        <CardDescription className="text-xs">Gerencie os setores das unidades organizacionais</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <Link href={route('institucional.setors.index')} className="block w-full">
                            <Button className="w-full justify-between">
                                <span>Acessar Setores</span>
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/20 opacity-60">
                    <CardHeader className="p-6 pb-4">
                        <div className="bg-muted text-muted-foreground mb-2 w-fit rounded-xl p-3">
                            <Users className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-lg font-semibold">Usuários</CardTitle>
                        <CardDescription className="text-xs">Gerencie usuários e suas vinculações</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <Button className="w-full" variant="outline" disabled>
                            Em breve
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-muted/20 opacity-60">
                    <CardHeader className="p-6 pb-4">
                        <div className="bg-muted text-muted-foreground mb-2 w-fit rounded-xl p-3">
                            <Settings className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-lg font-semibold">Configurações</CardTitle>
                        <CardDescription className="text-xs">Configurações gerais do sistema</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 pt-0">
                        <Button className="w-full" variant="outline" disabled>
                            Em breve
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
