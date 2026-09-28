import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserAvatar } from '@/presentation/atoms/UserAvatar';
import { Setor, User } from '@/types';
import { Loader2, Mail, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    setor: Setor;
    usuarios?: User[];
}

export function UsuariosSetor({ setor, usuarios: initialUsuarios }: Props) {
    const [usuarios, setUsuarios] = useState<User[]>(initialUsuarios ?? []);
    const [loading, setLoading] = useState<boolean>(!initialUsuarios);

    useEffect(() => {
        if (initialUsuarios) {
            setUsuarios(initialUsuarios);
            setLoading(false);
            return;
        }

        let isMounted = true;
        setLoading(true);

        fetch(route('institucional.setors.usuarios', setor.id), {
            headers: { Accept: 'application/json' },
        })
            .then((res) => res.json() as Promise<User[]>)
            .then((data) => {
                if (isMounted) {
                    setUsuarios(data);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [setor.id, initialUsuarios]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsuarioIcon className="h-5 w-5" />
                        {setor.nome}
                    </CardTitle>
                    <CardDescription>
                        Sigla: {setor.sigla} • {usuarios.length} usuário(s) vinculado(s)
                    </CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Usuários Vinculados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-muted-foreground flex items-center justify-center py-8">
                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                            <span>Carregando usuários...</span>
                        </div>
                    ) : usuarios.length === 0 ? (
                        <div className="text-muted-foreground py-8 text-center">
                            <UsuarioIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                            <p>Nenhum usuário vinculado a este setor</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuário</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {usuarios.map((usuario) => (
                                        <TableRow key={usuario.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <UserAvatar user={usuario} className="h-8 w-8" fallbackClassName="text-xs" />
                                                    <div>
                                                        <div className="font-medium">{usuario.name}</div>
                                                        <div className="text-muted-foreground text-sm">ID: {usuario.id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Mail className="text-muted-foreground h-4 w-4" />
                                                    <span className="text-sm">{usuario.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="text-muted-foreground h-4 w-4" />
                                                    <span className="text-sm">{usuario.telefone || 'Não informado'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={usuario.email_verified_at ? 'default' : 'secondary'}>
                                                    {usuario.email_verified_at ? 'Verificado' : 'Pendente'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const UsuarioIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);
