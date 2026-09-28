import { Modal } from '@/presentation/molecules/Modal';
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
            <Modal
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
            </Modal>

            <Modal
                open={!!editingSetor}
                onOpenChange={() => {
                    setEditingSetor(null);
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
            </Modal>

            <Modal
                open={!!viewingUsuarios}
                onOpenChange={() => {
                    setViewingUsuarios(null);
                }}
                title="Usuários do Setor"
                description={`${viewingUsuarios?.nome ?? ''} - ${viewingUsuarios?.unidade?.nome ?? ''}`}
                size="xl"
                className="max-h-[90vh] w-full overflow-y-auto sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] xl:max-w-[1200px]"
            >
                {viewingUsuarios && <UsuariosSetor setor={viewingUsuarios} usuarios={getUsuariosDoSetor(viewingUsuarios.id)} />}
            </Modal>
        </>
    );
}
