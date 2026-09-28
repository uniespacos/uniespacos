import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { TURNO_LABEL, TURNOS_ORDENADOS } from '@/constants/turnos';
import { Modal } from '@/presentation/molecules/Modal';
import { UserSearchCombobox } from '@/presentation/molecules/UserSearchComboBox';
import type { Espaco, User } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface GerenciarGestoresModalProps {
    espaco: Espaco | null;
    usuarios: User[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (espacoId: number, gestores: Record<string, number | null>) => void;
}

export function GerenciarGestoresModal({ espaco, usuarios, isOpen, onClose, onSave }: GerenciarGestoresModalProps) {
    const [gestores, setGestores] = useState<Record<string, number | null>>({
        manha: null,
        tarde: null,
        noite: null,
    });

    useEffect(() => {
        if (espaco?.agendas) {
            setGestores({
                manha: espaco.agendas.find((a) => a.turno === 'manha')?.user?.id ?? null,
                tarde: espaco.agendas.find((a) => a.turno === 'tarde')?.user?.id ?? null,
                noite: espaco.agendas.find((a) => a.turno === 'noite')?.user?.id ?? null,
            });
        } else {
            setGestores({ manha: null, tarde: null, noite: null });
        }
    }, [espaco]);

    const gestoresIniciais = useMemo(() => {
        if (!espaco?.agendas) return { manha: null, tarde: null, noite: null };

        return {
            manha: espaco.agendas.find((a) => a.turno === 'manha')?.user?.id ?? null,
            tarde: espaco.agendas.find((a) => a.turno === 'tarde')?.user?.id ?? null,
            noite: espaco.agendas.find((a) => a.turno === 'noite')?.user?.id ?? null,
        };
    }, [espaco?.agendas]);

    const handleSalvar = useCallback(() => {
        if (espaco) {
            onSave(espaco.id, gestores);
            onClose();
        }
    }, [espaco, gestores, onSave, onClose]);

    const handleGestorChange = useCallback((turno: string, userId: number | null) => {
        setGestores((prev) => ({
            ...prev,
            [turno]: userId,
        }));
    }, []);

    const hasChanges = useMemo(() => {
        return Object.keys(gestores).some((turno) => gestores[turno] !== gestoresIniciais[turno as keyof typeof gestoresIniciais]);
    }, [gestores, gestoresIniciais]);

    if (!espaco) return null;

    return (
        <Modal
            open={isOpen}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
            title={`Gerenciar Gestores - ${espaco.nome}`}
            description="Selecione os gestores responsáveis por cada turno. Você pode buscar por nome ou email."
            size="lg"
        >
            <div className="space-y-6">
                <div className="space-y-4">
                    {TURNOS_ORDENADOS.map((turno) => (
                        <div key={turno} className="space-y-2">
                            <Label className="block">{TURNO_LABEL[turno]}</Label>
                            <UserSearchCombobox
                                usuarios={usuarios}
                                value={gestores[turno]}
                                onValueChange={(value) => {
                                    handleGestorChange(turno, value);
                                }}
                                placeholder={`Buscar gestor para o turno da ${TURNO_LABEL[turno].toLowerCase()}...`}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-2 border-t pt-4">
                    <Button variant="outline" onClick={onClose} type="button">
                        Cancelar
                    </Button>
                    <Button onClick={handleSalvar} disabled={!hasChanges} type="button">
                        {hasChanges ? 'Salvar Alterações' : 'Nenhuma Alteração'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
