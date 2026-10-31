import { ResponsiveModal } from '@/presentation/molecules/ResponsiveModal';
import { SetorForm } from '@/presentation/organisms/SetorForm';
import { UsuariosSetor } from '@/presentation/organisms/UsuariosSetor';
import { Instituicao, Setor, Unidade, User } from '@/types';

interface Props {
    isCreateModalOpen: boolean;
    setIsCreateModalOpen: (open: boolean) => void;
    editingSetor: Setor | null;
    setEditingSetor: (setor: Setor | null) => void;
    viewingUsuarios: Setor | null;
    setViewingUsuarios: (setor: Setor | null) => void;
    instituicao: Instituicao;
    unidades: Unidade[];
    usuarios?: User[];
}

export function ModaisSetor({
    isCreateModalOpen,
    setIsCreateModalOpen,
    editingSetor,
    setEditingSetor,
    viewingUsuarios,
    setViewingUsuarios,
    instituicao,
    unidades,
    usuarios,
}: Props) {
    const getUsuariosDoSetor = (setorId: number) => {
        return usuarios ? usuarios.filter((user) => user.setor?.id === setorId) : undefined;
    };

    return (
        <>
            <ResponsiveModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                title="Novo Setor"
                description="Cadastre um novo setor para uma unidade"
                size="md"
            >
                <SetorForm
                    instituicao={instituicao}
                    unidades={unidades}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                    }}
                    onCancel={() => {
                        setIsCreateModalOpen(false);
                    }}
                />
            </ResponsiveModal>

            <ResponsiveModal
                open={!!editingSetor}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingSetor(null);
                    }
                }}
                title="Editar Setor"
                description="Altere as informações do setor"
                size="md"
            >
                {editingSetor && (
                    <SetorForm
                        setor={editingSetor}
                        instituicao={instituicao}
                        unidades={unidades}
                        onSuccess={() => {
                            setEditingSetor(null);
                        }}
                        onCancel={() => {
                            setEditingSetor(null);
                        }}
                    />
                )}
            </ResponsiveModal>

            <ResponsiveModal
                open={!!viewingUsuarios}
                onOpenChange={(open) => {
                    if (!open) {
                        setViewingUsuarios(null);
                    }
                }}
                title="Usuários do Setor"
                description={`${viewingUsuarios?.nome ?? ''} - ${viewingUsuarios?.unidade?.nome ?? ''}`}
                size="5xl"
            >
                {viewingUsuarios && <UsuariosSetor setor={viewingUsuarios} usuarios={getUsuariosDoSetor(viewingUsuarios.id)} />}
            </ResponsiveModal>
        </>
    );
}
